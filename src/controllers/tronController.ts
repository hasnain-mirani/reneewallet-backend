// src/controllers/tronController.ts
import type { Request, Response, NextFunction } from "express";
import { tronService } from "../services/tronService";
import TronWeb from "tronweb"; // <- for direct normalize attempts if needed
import { toBase58, toHex41 } from "../utils/tronAddress"; // keep your helpers for normalize

const asString = (v: unknown) => (typeof v === "string" ? v : String(v ?? "")).trim();

/**
 * GET /api/tron/account/:address
 */
export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = asString((req.params as any).address);
    if (!raw) {
      return res.status(400).json({ ok: false, error: { status: 400, message: "address param is required" } });
    }

    // Prefer TronWeb validation through the service (more canonical)
    const isValid = tronService.isAddress(raw);
    if (!isValid) {
      // try to normalize anyway to provide a better error
      let hint = "Invalid TRON address";
      try {
        if (raw.startsWith("41")) {
          TronWeb.address.fromHex(raw); // will throw if bad
          hint = "Bad checksum in hex-41 address";
        } else if (raw.startsWith("T")) {
          TronWeb.address.toHex(raw);   // will throw if bad
          hint = "Bad checksum in base58 address";
        }
      } catch {}
      return res.status(400).json({ ok: false, error: { status: 400, message: hint, address: raw } });
    }

    const base58 = raw.startsWith("T") ? raw : TronWeb.address.fromHex(raw);
    const addressHex = toHex41(base58);

    const [trx, resources] = await Promise.all([
      tronService.getTrxBalance(base58),
      tronService.getAccountResources(base58),
    ]);

    return res.json({ ok: true, address: base58, addressHex, trx, resources });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tron/trc20/:tokenAddress/balance/:address
 */
export const getTrc20Balance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenAddress = asString((req.params as any).tokenAddress);
    const address      = asString((req.params as any).address);

    if (!tokenAddress || !address) {
      return res.status(400).json({ ok: false, error: { status: 400, message: "tokenAddress and address are required" } });
    }
    if (!tronService.isAddress(tokenAddress) || !tronService.isAddress(address)) {
      return res.status(400).json({ ok: false, error: { status: 400, message: "Invalid TRON address" } });
    }

    const tokenHex = tokenAddress.startsWith("41") ? tokenAddress : TronWeb.address.toHex(tokenAddress);
    const walletBase58 = address.startsWith("T") ? address : TronWeb.address.fromHex(address);

    const info = await tronService.getTrc20Balance(tokenHex, walletBase58);
    return res.json({ ok: true, tokenAddress: tokenHex, address: walletBase58, ...info });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tron/account/:address/trc20-transfers
 */
export const getTrc20Transfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = asString((req.params as any).address);
    if (!tronService.isAddress(raw)) {
      return res.status(400).json({ ok: false, error: { status: 400, message: "Invalid TRON address" } });
    }
    const walletBase58 = raw.startsWith("T") ? raw : TronWeb.address.fromHex(raw);

    const q = req.query as any;
    const limit = Number.isFinite(Number(q.limit)) ? Math.max(1, Math.min(200, Number(q.limit))) : 20;
    const fingerprint = q.fingerprint ? asString(q.fingerprint) : undefined;

    const data = await tronService.getTrc20Transfers(walletBase58, limit, fingerprint);
    return res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/tron/trc20/transfer
 */
export const postTrc20Transfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tokenAddress = asString((req.body as any).tokenAddress);
    const to           = asString((req.body as any).to);
    const amountRaw    = (req.body as any).amount;
    const privateKey   = (req.body as any).privateKey ? asString((req.body as any).privateKey) : undefined;
    const feeLimitSun  = (req.body as any).feeLimitSun != null ? Number((req.body as any).feeLimitSun) : undefined;

    if (!tronService.isAddress(tokenAddress) || !tronService.isAddress(to)) {
      return res.status(400).json({ ok: false, error: { status: 400, message: "Invalid TRON address" } });
    }

    const tokenHex     = tokenAddress.startsWith("41") ? tokenAddress : TronWeb.address.toHex(tokenAddress);
    const toBase58Addr = to.startsWith("T") ? to : TronWeb.address.fromHex(to);
    const amountStr    = typeof amountRaw === "number" ? String(amountRaw) : asString(amountRaw);

    const result = await tronService.transferTrc20(tokenHex, toBase58Addr, amountStr, { privateKey, feeLimitSun });
    return res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

// src/controllers/tronController.ts
import { Request, Response, NextFunction } from "express";
import TronWeb from "tronweb";
import { tronService } from "../services/tronService";
import { HttpError } from "../utils/httpError";

/* ---------- Helpers: normalization & validation ---------- */

const HEX41 = /^41[a-fA-F0-9]{40}$/;

function isBase58OrHex(addr: string) {
  const s = (addr || "").trim();
  return TronWeb.isAddress(s) || HEX41.test(s);
}

/** Normalize any TRON address (wallet or contract) to Base58 (T...) */
function toBase58Safe(addr: string): string {
  const s = (addr || "").trim();
  if (TronWeb.isAddress(s)) {
    // could already be base58 or hex; toBase58 handles both
    return TronWeb.address.toBase58(s);
  }
  if (HEX41.test(s)) {
    return TronWeb.address.fromHex(s);
  }
  throw new HttpError(400, "Invalid TRON address");
}

/** Normalize any TRON address (wallet or contract) to hex 41... */
function toHex41Safe(addr: string): string {
  const s = (addr || "").trim();
  if (HEX41.test(s)) return s.toLowerCase();
  if (TronWeb.isAddress(s)) {
    const hex = TronWeb.address.toHex(s);
    if (!HEX41.test(hex)) throw new HttpError(400, "Invalid TRON address");
    return hex.toLowerCase();
  }
  throw new HttpError(400, "Invalid TRON address");
}

/* ---------- Controllers ---------- */

export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = (req.params as { address: string }).address;
    if (!isBase58OrHex(raw)) throw new HttpError(400, "Invalid TRON address");

    const base58 = toBase58Safe(raw);
    // If your service expects base58 for account lookups, pass base58
    const [trx, resources] = await Promise.all([
      tronService.getTrxBalance(base58),
      tronService.getAccountResources(base58),
    ]);

    // Optional: include the hex form for client convenience
    const hex41 = TronWeb.address.toHex(base58).toLowerCase();

    res.json({ ok: true, address: base58, addressHex: hex41, trx, resources });
  } catch (err) {
    next(err);
  }
};

export const getTrc20Balance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenAddress, address } = req.params as { tokenAddress: string; address: string };
    if (!isBase58OrHex(address)) throw new HttpError(400, "Invalid TRON address");
    if (!isBase58OrHex(tokenAddress)) throw new HttpError(400, "Invalid TRC-20 contract address");

    const base58 = toBase58Safe(address);
    // TronGrid/TRC-20 balance APIs generally work with hex contract
    const contractHex = toHex41Safe(tokenAddress);

    const info = await tronService.getTrc20Balance(contractHex, base58);
    res.json({ ok: true, tokenAddress: contractHex, address: base58, ...info });
  } catch (err) {
    next(err);
  }
};

export const getTrc20Transfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = (req.params as { address: string }).address;
    if (!isBase58OrHex(raw)) throw new HttpError(400, "Invalid TRON address");

    const base58 = toBase58Safe(raw);
    const { limit, fingerprint } = req.query as { limit?: string; fingerprint?: string };
    const limitNum = Number.isFinite(Number(limit)) ? Number(limit) : 20;

    const data = await tronService.getTrc20Transfers(base58, limitNum, fingerprint);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const postTrc20Transfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenAddress, to, amount, privateKey, feeLimitSun } = req.body as {
      tokenAddress: string;
      to: string;
      amount: string | number;
      privateKey?: string;
      feeLimitSun?: number;
    };

    if (!isBase58OrHex(to)) throw new HttpError(400, "Invalid recipient address");
    if (!isBase58OrHex(tokenAddress)) throw new HttpError(400, "Invalid TRC-20 contract address");

    const toBase58 = toBase58Safe(to);
    const contractHex = toHex41Safe(tokenAddress);

    // you may want to coerce amount to string (tronweb often expects string for big numbers)
    const amtStr = typeof amount === "number" ? String(amount) : (amount || "").toString();

    const result = await tronService.transferTrc20(contractHex, toBase58, amtStr, {
      privateKey,
      feeLimitSun,
    });

    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

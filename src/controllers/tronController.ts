import { Request, Response, NextFunction } from "express";
import { tronService } from "../services/tronService";
import { HttpError } from "../utils/httpError";

export const getAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params as { address: string };
    if (!tronService.isAddress(address)) throw new HttpError(400, "Invalid TRON address");

    const [trx, resources] = await Promise.all([
      tronService.getTrxBalance(address),
      tronService.getAccountResources(address),
    ]);

    res.json({ ok: true, address, trx, resources });
  } catch (err) {
    next(err);
  }
};

export const getTrc20Balance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenAddress, address } = req.params as { tokenAddress: string; address: string };
    if (!tronService.isAddress(address)) throw new HttpError(400, "Invalid TRON address");

    const info = await tronService.getTrc20Balance(tokenAddress, address);
    res.json({ ok: true, tokenAddress, address, ...info });
  } catch (err) {
    next(err);
  }
};

export const getTrc20Transfers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params as { address: string };
    if (!tronService.isAddress(address)) throw new HttpError(400, "Invalid TRON address");

    const { limit, fingerprint } = req.query as any;
    const data = await tronService.getTrc20Transfers(address, Number(limit ?? 20), fingerprint);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const postTrc20Transfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tokenAddress, to, amount, privateKey, feeLimitSun } = req.body as any;
    if (!tronService.isAddress(to)) throw new HttpError(400, "Invalid recipient address");

    const result = await tronService.transferTrc20(tokenAddress, to, amount, {
      privateKey,
      feeLimitSun,
    });
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
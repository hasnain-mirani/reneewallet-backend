import type { Request, Response } from "express";
import { getWalletStats, queryWallets, setWalletStatus } from "../services/wallets.service";

export async function getWallets(req: Request, res: Response) {
  const search = String(req.query.search || "").trim();
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 10, 100);
  const sort = String(req.query.sort || "lastTransaction:desc");

  const result = queryWallets({ search, page, pageSize, sort });
  res.json(result);
}

export async function getWalletsStats(_req: Request, res: Response) {
  res.json(getWalletStats());
}

export async function patchWalletStatus(req: Request, res: Response) {
  const { id } = req.params;
  const status = String((req.body?.status || "")).trim();
  if (status !== "Active" && status !== "Frozen") {
    return res.status(400).json({ message: 'status must be "Active" or "Frozen"' });
  }
  const ok = setWalletStatus(id, status as "Active" | "Frozen");
  if (!ok) return res.status(404).json({ message: "Wallet not found" });
  res.status(204).end();
}

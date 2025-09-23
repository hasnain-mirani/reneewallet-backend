import type { Request, Response } from "express";
import {
  getDashboardData,
  getRecentTx,
  queryUsers,
  getStats,
  removeUser,
  createUserRecord, // ✅ NEW
} from "../services/admin.service";

// Dashboard
export async function getDashboard(_req: Request, res: Response) {
  const payload = getDashboardData();
  res.json(payload);
}

// Recent transactions
export async function getRecentTransactions(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 5, 100);
  const items = getRecentTx(limit);
  res.json({ items });
}

// Users list (search/paginate/sort)
export async function getUsers(req: Request, res: Response) {
  const search = String(req.query.search || "").trim();
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 10, 100);
  const sort = String(req.query.sort || "createdAt:desc");

  const result = queryUsers({ search, page, pageSize, sort });
  res.json(result);
}

// Users stats
export async function getUserStats(_req: Request, res: Response) {
  res.json(getStats());
}

// Create user  ✅ NEW
export async function createUser(req: Request, res: Response) {
  const { name, email, role, status, walletCount = 0, totalBalance = 0 } = req.body || {};

  if (!name || !email || !role || !status) {
    return res.status(400).json({ message: "name, email, role, status are required" });
  }

  // Optional: minimal email sanity check (non-blocking)
  const emailOk = typeof email === "string" && /\S+@\S+\.\S+/.test(email);
  if (!emailOk) {
    return res.status(400).json({ message: "email is invalid" });
  }

  const user = createUserRecord({
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    role,
    status,
    walletCount: Number(walletCount) || 0,
    totalBalance: Number(totalBalance) || 0,
  });

  return res.status(201).json(user);
}

// Delete user
export async function deleteUserById(req: Request, res: Response) {
  const { id } = req.params;
  const ok = removeUser(id);
  if (!ok) return res.status(404).json({ message: "User not found" });
  res.status(204).end();
}


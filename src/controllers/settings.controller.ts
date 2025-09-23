import type { Request, Response } from "express";
import {
  getAllSettings,
  setProfile,
  setNotifications,
  setSystem,
  listKeys,
  createKey,
  revokeKey,
} from "../services/settings.service.js";

export async function getSettings(_req: Request, res: Response) {
  res.json(getAllSettings());
}
export async function patchProfile(req: Request, res: Response) {
  const body = req.body || {};
  res.json(setProfile(body));
}
export async function patchNotifications(req: Request, res: Response) {
  const body = req.body || {};
  res.json(setNotifications(body));
}
export async function patchSystem(req: Request, res: Response) {
  const body = req.body || {};
  res.json(setSystem(body));
}
export async function getApiKeys(_req: Request, res: Response) {
  res.json({ items: listKeys() });
}
export async function postApiKey(req: Request, res: Response) {
  const name = String(req.body?.name || "API Key");
  const out = createKey(name);
  res.status(201).json(out);
}
export async function deleteApiKey(req: Request, res: Response) {
  const { id } = req.params;
  const ok = revokeKey(id);
  if (!ok) return res.status(404).json({ message: "Key not found" });
  res.status(204).end();
}

import { Request, Response } from "express";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ ok: false, error: { message: "Not Found", status: 404 } });
}
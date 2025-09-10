import { Request, Response } from "express";

export function health(_req: Request, res: Response) {
  res.json({
    ok: true,
    name: "tron-backend-ts",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
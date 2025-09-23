import { Router } from "express";
import axios from "axios";

const router = Router();

const AX = axios.create({
  timeout: 30_000,
  validateStatus: () => true,
});

const TRON_HOST = (process.env.TRON_HOST || "https://api.trongrid.io").trim().replace(/\/$/, "");
const TRON_KEY  = (process.env.TRONGRID_API_KEY || "").trim();
const SOLANA_RPC = (process.env.SOLANA_RPC || "").trim();

// Solana (Alchemy or any JSON-RPC)
router.post("/solana", async (req, res) => {
  if (!SOLANA_RPC) return res.status(500).json({ ok: false, error: { status: 500, message: "SOLANA_RPC not configured" }});
  try {
    const resp = await AX.post(SOLANA_RPC, req.body ?? {}, {
      headers: { "Content-Type": "application/json" },
    });
    res.status(resp.status).set(resp.headers as any).send(resp.data);
  } catch (e) {
    res.status(502).json({ ok: false, error: { status: 502, message: "Solana RPC upstream error" }});
  }
});

// TRON (TronGrid / Nile) proxy
router.all("/tron/*", async (req, res) => {
  const params = req.params as Record<string, string | undefined>;
  const sub = params[0] || "";
  const url = `${TRON_HOST}/${sub}`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(TRON_KEY ? { "TRON-PRO-API-KEY": TRON_KEY } : {}),
  };

  try {
    const resp = await AX.request({
      method: req.method as any,
      url,
      headers,
      params: req.query,
      data: ["GET","HEAD"].includes(req.method) ? undefined : (req.body ?? {}),
    });
    res.status(resp.status).set(resp.headers as any).send(resp.data);
  } catch (e) {
    res.status(502).json({ ok: false, error: { status: 502, message: "Tron RPC upstream error" }});
  }
});
            
export default router;

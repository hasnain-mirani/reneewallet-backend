// src/routes/rpcRoutes.ts
import { Router } from "express";
import axios from "axios";

const router = Router();

// One axios instance for both upstreams
const AX = axios.create({
  timeout: 30_000,
  validateStatus: () => true, // let us forward upstream status codes
});

// ---- Env ----
const TRON_HOST = (process.env.TRON_HOST || "https://api.trongrid.io")
  .trim()
  .replace(/\/+$/, ""); // no trailing slash
const TRON_KEY = (process.env.TRONGRID_API_KEY || "").trim();
const SOLANA_RPC = (process.env.SOLANA_RPC || "").trim();

/* -------------------- Solana JSON-RPC proxy -------------------- */
/**
 * Mount path (in app.ts): app.use("/api/rpc", rpcRoutes)
 * Final URL: POST /api/rpc/solana
 */
router.post("/solana", async (req, res) => {
  if (!SOLANA_RPC) {
    return res
      .status(500)
      .json({ ok: false, error: { status: 500, message: "SOLANA_RPC not configured" } });
  }

  try {
    const upstream = await AX.post(SOLANA_RPC, req.body ?? {}, {
      headers: { "content-type": "application/json" },
    });
    // Forward upstream status + JSON body
    return res.status(upstream.status).json(upstream.data);
  } catch {
    return res
      .status(502)
      .json({ ok: false, error: { status: 502, message: "Solana RPC upstream error" } });
  }
});

/* ----------------------- TRON REST proxy ----------------------- */
/**
 * Wildcard route: everything after /tron/ is forwarded to TRON_HOST
 * Final URLs:
 *   POST /api/rpc/tron/wallet/getnowblock        ->  {TRON_HOST}/wallet/getnowblock
 *   POST /api/rpc/tron/wallet/getaccount         ->  {TRON_HOST}/wallet/getaccount
 */
router.all("/tron/*", async (req, res) => {
  // Express wildcard: for "/tron/*", the part matched by "*" is params[0]
  const subpath = (req.params as any)[0] as string; // e.g. "wallet/getaccount"
  const url = `${TRON_HOST}/${subpath.replace(/^\/+/, "")}`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(TRON_KEY ? { "TRON-PRO-API-KEY": TRON_KEY } : {}),
  };

  try {
    const upstream = await AX.request({
      method: req.method as any,
      url,
      headers,
      params: req.query,
      data: ["GET", "HEAD"].includes(req.method) ? undefined : (req.body ?? {}),
    });
    return res.status(upstream.status).json(upstream.data);
  } catch {
    return res
      .status(502)
      .json({ ok: false, error: { status: 502, message: "Tron RPC upstream error" } });
  }
});

export default router;

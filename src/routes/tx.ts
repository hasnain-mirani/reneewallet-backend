// src/routes/tx.ts
import { Router } from "express";
import fetch, { Response } from "node-fetch";

const SOLANA_RPC = process.env.SOLANA_RPC!;
const TRON_HOST = process.env.TRON_HOST || "https://api.trongrid.io";
const TRON_KEY = process.env.TRONGRID_API_KEY || "";

const router = Router();

/** ---------- shared helpers/types ---------- */

type RpcResponse<T> = {
  result?: T;
  error?: unknown;
  // Some providers put error details at the top-level differently; keep it loose.
  [k: string]: unknown;
};

async function parseJson<T>(r: Response): Promise<T> {
  return (await r.json()) as T;
}

/** ---------- SOLANA ---------- */

// getLatestBlockhash -> we only use 'value'
type LatestBlockhashValue = {
  blockhash: string;
  lastValidBlockHeight: number;
};
type LatestBlockhashResult = { value: LatestBlockhashValue };

// sendRawTransaction returns a signature string
type SendTxSignature = string;

// Prepare unsigned transfer (online step)
router.post("/solana/prepare-transfer", async (req, res) => {
  try {
    const { from, to, lamports } = req.body as {
      from: string;
      to: string;
      lamports: number;
    };
    if (!from || !to || !lamports) {
      return res.status(400).json({ error: "from, to, lamports required" });
    }

    const bhResp = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestBlockhash",
        params: [{ commitment: "finalized" }],
      }),
    });

    const bh = await parseJson<RpcResponse<LatestBlockhashResult>>(bhResp);

    const { blockhash, lastValidBlockHeight } = bh.result?.value ?? ({} as LatestBlockhashValue);
    if (!blockhash) return res.status(500).json({ error: "Cannot fetch blockhash" });

    // Return the minimum data needed to create the unsigned tx on the offline machine.
    return res.json({ ok: true, from, to, lamports, blockhash, lastValidBlockHeight });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "solana prepare failed" });
  }
});

// Broadcast signed transfer (online step)
router.post("/solana/broadcast", async (req, res) => {
  try {
    const { signedTxBase64 } = req.body as { signedTxBase64: string };
    if (!signedTxBase64) return res.status(400).json({ error: "signedTxBase64 required" });

    const r = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendRawTransaction",
        params: [signedTxBase64],
      }),
    });

    const j = await parseJson<RpcResponse<SendTxSignature>>(r);
    if (j.error) return res.status(400).json(j);

    return res.json({ ok: true, signature: j.result as SendTxSignature });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "solana broadcast failed" });
  }
});

/** ---------- TRON ---------- */

// Minimal shapes for TRON responses we touch
type TronCreateTxResponse = {
  // typical fields
  txID?: string;
  raw_data?: unknown;
  raw_data_hex?: string;
  visible?: boolean;
  // error fields vary across gateways; support both cases
  Error?: unknown;
  error?: unknown;
  [k: string]: unknown;
};

type TronBroadcastResponse = {
  result?: boolean;
  txid?: string;
  code?: string;
  message?: string; // base64-encoded sometimes
  [k: string]: unknown;
};

// Prepare unsigned TRX transfer (online step)
router.post("/tron/prepare-transfer", async (req, res) => {
  try {
    const { from, to, amountSun } = req.body as {
      from: string;
      to: string;
      amountSun: number;
    };
    if (!from || !to || !amountSun) {
      return res.status(400).json({ error: "from, to, amountSun required" });
    }

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (TRON_KEY) headers["TRON-PRO-API-KEY"] = TRON_KEY;

    const r = await fetch(`${TRON_HOST}/wallet/createtransaction`, {
      method: "POST",
      headers,
      body: JSON.stringify({ to_address: to, owner_address: from, amount: amountSun }),
    });

    const j = await parseJson<TronCreateTxResponse>(r);
    // Some nodes return 'Error' (capital E), some 'error' (lowercase).
    if (j.Error || j.error) return res.status(400).json(j);

    // Return raw unsigned tx json (to be signed offline)
    return res.json({ ok: true, tx: j });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "tron prepare failed" });
  }
});

// Broadcast signed TRON transaction (online step)
router.post("/tron/broadcast", async (req, res) => {
  try {
    const { signedTx } = req.body as { signedTx: unknown };
    if (!signedTx) return res.status(400).json({ error: "signedTx required" });

    const headers: Record<string, string> = { "content-type": "application/json" };
    if (TRON_KEY) headers["TRON-PRO-API-KEY"] = TRON_KEY;

    const r = await fetch(`${TRON_HOST}/wallet/broadcasttransaction`, {
      method: "POST",
      headers,
      body: JSON.stringify(signedTx),
    });

    const j = await parseJson<TronBroadcastResponse>(r);
    return res.status(r.ok ? 200 : 400).json(j);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "tron broadcast failed" });
  }
});

export default router;

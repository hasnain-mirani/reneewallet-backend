// src/routes/tx.ts
import { Router } from "express";
import fetch from "node-fetch";

const SOLANA_RPC = process.env.SOLANA_RPC!;
const TRON_HOST = process.env.TRON_HOST || "https://api.trongrid.io";
const TRON_KEY  = process.env.TRONGRID_API_KEY;

const router = Router();

// -------- SOLANA --------

// Prepare unsigned transfer (online step)
router.post("/solana/prepare-transfer", async (req, res) => {
  try {
    const { from, to, lamports } = req.body as { from: string; to: string; lamports: number };
    if (!from || !to || !lamports) return res.status(400).json({ error: "from, to, lamports required" });

    // recent blockhash
    const bh = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getLatestBlockhash", params: [{ commitment: "finalized" }] }),
    }).then(r => r.json());

    const { blockhash, lastValidBlockHeight } = bh?.result?.value ?? {};
    if (!blockhash) return res.status(500).json({ error: "Cannot fetch blockhash" });

    // Return the minimum data needed to create the unsigned tx on the offline machine.
    // (You can also choose to assemble the v0 message here and send base64; keeping it simple.)
    return res.json({ ok: true, from, to, lamports, blockhash, lastValidBlockHeight });
  } catch (e:any) {
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
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "sendRawTransaction", params: [signedTxBase64] }),
    });
    const j = await r.json();
    if (j.error) return res.status(400).json(j);
    res.json({ ok: true, signature: j.result });
  } catch (e:any) {
    res.status(500).json({ error: e.message || "solana broadcast failed" });
  }
});

// -------- TRON --------

// Prepare unsigned TRX transfer (online step)
// Uses TronGrid's /wallet/createtransaction to build an unsigned tx
router.post("/tron/prepare-transfer", async (req, res) => {
  try {
    const { from, to, amountSun } = req.body as { from: string; to: string; amountSun: number };
    if (!from || !to || !amountSun) return res.status(400).json({ error: "from, to, amountSun required" });

    const headers: any = { "content-type": "application/json" };
    if (TRON_KEY) headers["TRON-PRO-API-KEY"] = TRON_KEY;

    const r = await fetch(`${TRON_HOST}/wallet/createtransaction`, {
      method: "POST",
      headers,
      body: JSON.stringify({ to_address: to, owner_address: from, amount: amountSun }),
    });
    const j = await r.json();
    if (j.Error) return res.status(400).json(j);
    // Return raw unsigned tx json (to be signed offline)
    res.json({ ok: true, tx: j });
  } catch (e:any) {
    res.status(500).json({ error: e.message || "tron prepare failed" });
  }
});

// Broadcast signed TRON transaction (online step)
router.post("/tron/broadcast", async (req, res) => {
  try {
    const { signedTx } = req.body as { signedTx: any };
    if (!signedTx) return res.status(400).json({ error: "signedTx required" });

    const headers: any = { "content-type": "application/json" };
    if (TRON_KEY) headers["TRON-PRO-API-KEY"] = TRON_KEY;

    const r = await fetch(`${TRON_HOST}/wallet/broadcasttransaction`, {
      method: "POST",
      headers,
      body: JSON.stringify(signedTx),
    });
    const j = await r.json();
    res.status(r.ok ? 200 : 400).json(j);
  } catch (e:any) {
    res.status(500).json({ error: e.message || "tron broadcast failed" });
  }
});

export default router;

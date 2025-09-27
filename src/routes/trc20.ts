// src/routes/trc20.ts
import { Router } from "express";
import { tronService } from "../services/tronService";

const router = Router();

/** POST /api/trc20/meta { token } */
router.post("/meta", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    if (!token) return res.status(400).json({ ok: false, error: "token is required" });
    const meta = await tronService.getTrc20Meta(token);
    res.json({ ok: true, meta });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "meta failed" });
  }
});

/** POST /api/trc20/balance { token, holder } */
router.post("/balance", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    const holder = String(req.body?.holder ?? "").trim();
    if (!token || !holder) return res.status(400).json({ ok: false, error: "token & holder are required" });

    const meta = await tronService.getTrc20Meta(token);
    const b = await tronService.getTrc20Balance(token, holder);
    res.json({ ok: true, meta, balance: b });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "balance failed" });
  }
});

/** POST /api/trc20/transfer { token, to, amount }  (amount in human units) */
router.post("/transfer", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    const to = String(req.body?.to ?? "").trim();
    const amount = String(req.body?.amount ?? "").trim();
    if (!token || !to || !amount) return res.status(400).json({ ok: false, error: "token, to, amount are required" });

    const meta = await tronService.getTrc20Meta(token);
    const raw = tronService.toSmallestUnits(amount, meta.decimals);
    const { txId } = await tronService.transferTrc20(token, to, raw);
    res.json({ ok: true, txId });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "transfer failed" });
  }
});

/** POST /api/trc20/approve { token, spender, amount } (amount in human units) */
router.post("/approve", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    const spender = String(req.body?.spender ?? "").trim();
    const amount = String(req.body?.amount ?? "").trim();
    if (!token || !spender || !amount) return res.status(400).json({ ok: false, error: "token, spender, amount are required" });

    const meta = await tronService.getTrc20Meta(token);
    const raw = tronService.toSmallestUnits(amount, meta.decimals);
    const { txId } = await tronService.approveTrc20(token, spender, raw);
    res.json({ ok: true, txId });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "approve failed" });
  }
});

/** POST /api/trc20/allowance { token, owner, spender } */
router.post("/allowance", async (req, res) => {
  try {
    const token = String(req.body?.token ?? "").trim();
    const owner = String(req.body?.owner ?? "").trim();
    const spender = String(req.body?.spender ?? "").trim();
    if (!token || !owner || !spender) return res.status(400).json({ ok: false, error: "token, owner, spender are required" });

    const meta = await tronService.getTrc20Meta(token);
    const { raw } = await tronService.allowanceTrc20(token, owner, spender);
    const human = tronService.fromSmallestUnits(raw, meta.decimals);
    res.json({ ok: true, meta, raw, allowance: human });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "allowance failed" });
  }
});

/** GET /api/trc20/transfers?address=T...&limit=20&fingerprint=... */
router.get("/transfers", async (req, res) => {
  try {
    const address = String(req.query?.address ?? "").trim();
    const limit = Number(req.query?.limit ?? 20);
    const fingerprint = req.query?.fingerprint ? String(req.query.fingerprint) : undefined;

    if (!address) return res.status(400).json({ ok: false, error: "address is required" });
    const data = await tronService.getTrc20Transfers(address, limit, fingerprint);
    res.json({ ok: true, data });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e?.message || "history failed" });
  }
});

export default router;

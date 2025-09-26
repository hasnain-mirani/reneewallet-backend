import { Router } from "express";
// Node 18+ has global fetch
const router = Router();

router.get("/prices", async (req, res) => {
  const ids = (req.query.ids as string) || "solana,tron";
  const vs  = (req.query.vs  as string) || "usd";

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=${encodeURIComponent(vs)}`;
    const r = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    if (!r.ok) return res.status(r.status).json({ error: `coingecko ${r.status}` });
    const j = await r.json();
    res.set("Cache-Control", "public, max-age=60");
    res.json(j);
  } catch (e) {
    res.status(502).json({ error: "coingecko failed" });
  }
});

export default router;

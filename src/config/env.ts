import dotenv from "dotenv";
dotenv.config();

const required = (name: string, fallback?: string) => {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
};

const asBool = (name: string, fallback = false) => {
  const v = process.env[name];
  if (v == null) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
};

const asNum = (name: string, fallback: number) => {
  const s = process.env[name];
  const n = s ? Number(s) : fallback;
  return Number.isFinite(n) ? n : fallback;
};

const asList = (name: string, fallbackCSV: string) => {
  const csv = process.env[name] ?? fallbackCSV;
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: asNum("PORT", 5000),

  // If you’re behind nginx/proxy in prod, set TRUST_PROXY=1
  trustProxy: asBool("TRUST_PROXY", false),

  // Comma-separated list, e.g.
  // CORS_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,https://your-frontend.vercel.app
  corsOrigins: asList("CORS_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080"),

  tron: {
    host: required("TRON_HOST", "https://api.trongrid.io"),
    apiKey: process.env.TRONGRID_API_KEY ?? "",
    senderPrivateKey: process.env.SENDER_PRIVATE_KEY,
    feeLimitSun: asNum("FEE_LIMIT_SUN", 10_000_000),
  },
};

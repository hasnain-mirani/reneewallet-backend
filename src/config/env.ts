import dotenv from "dotenv";
dotenv.config();

const required = (name: string, fallback?: string) => {
  const val = process.env[name] ?? fallback;
  if (val === undefined || val === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
};

export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "5000", 10),
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  tron: {
    host: required("TRON_HOST", "https://api.trongrid.io"),
    apiKey: process.env.TRONGRID_API_KEY ?? "",
    senderPrivateKey: process.env.SENDER_PRIVATE_KEY,
    feeLimitSun: parseInt(process.env.FEE_LIMIT_SUN ?? "10000000", 10),
  },
};
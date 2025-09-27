import { z } from "zod";
import TronWeb from "tronweb";

// ---- Helpers ----
const HEX41 = /^41[a-fA-F0-9]{40}$/;
const HEX64 = /^(0x)?[a-fA-F0-9]{64}$/;

const isTronAddress = (s: string) => TronWeb.isAddress(s) || HEX41.test(s);

const toFormats = (addr: string) => {
  const a = addr.trim();
  const base58 = a.startsWith("T") ? a : TronWeb.address.toBase58(a);
  const hex = a.startsWith("41") ? a : TronWeb.address.toHex(a);
  return { base58, hex };
};

// A schema that VALIDATES a TRON address string and then RETURNS BOTH FORMATS
export const tronAddressSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => isTronAddress(s), { message: "Invalid TRON address" })
  .transform((s) => toFormats(s)); // <-- output: { base58, hex }

// If you want to ACCEPT either number/string amounts but ensure > 0
export const positiveAmountSchema = z.union([z.string(), z.number()]).transform((v) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Amount must be > 0");
  return n;
});

// Optional private key (64-hex, allow 0x prefix)
export const optionalPrivateKeySchema = z
  .string()
  .trim()
  .regex(HEX64, "Private key must be 64 hex chars (optionally 0x-prefixed)")
  .transform((k) => (k.startsWith("0x") ? k.slice(2) : k))
  .optional();

// ---- Your DTOs (now normalized) ----
export const addressParamSchema = z.object({
  // returns { base58, hex }
  address: tronAddressSchema,
});

export const trc20BalanceParams = z.object({
  tokenAddress: tronAddressSchema, // contract address; also normalized
  address: tronAddressSchema,      // holder address; normalized
});

export const transfersQuery = z.object({
  limit: z.coerce.number().min(1).max(200).default(20),
  fingerprint: z.string().optional(), // opaque pagination token
});

export const transferBody = z.object({
  tokenAddress: tronAddressSchema,     // normalized
  to: tronAddressSchema,               // normalized
  amount: positiveAmountSchema,        // number > 0
  privateKey: optionalPrivateKeySchema,
  feeLimitSun: z.number().int().positive().default(15_000_000).optional(), // TRC20 default ~15 TRX
});

// ---- Example usage in a controller ----
// const { address } = addressParamSchema.parse(req.body);
// Now you have address.base58 and address.hex
// For node HTTP endpoints:
//  - If you send base58 -> include "visible": true
//  - If you send hex     -> omit visible OR set false

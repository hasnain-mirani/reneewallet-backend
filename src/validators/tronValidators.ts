import { z } from "zod";

export const addressParamSchema = z.object({
  address: z.string().min(26).max(50),
});

export const trc20BalanceParams = z.object({
  tokenAddress: z.string().min(26).max(50),
  address: z.string().min(26).max(50),
});

export const transfersQuery = z.object({
  limit: z.coerce.number().min(1).max(200).default(20),
  fingerprint: z.string().optional(),
});

export const transferBody = z.object({
  tokenAddress: z.string().min(26).max(50),
  to: z.string().min(26).max(50),
  amount: z.union([z.string(), z.number()]),
  privateKey: z.string().min(32).optional(),
  feeLimitSun: z.number().int().positive().optional()
});
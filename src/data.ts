// src/data.ts
export type SeedTransaction = {
  id: string;
  hash: string;
  type: "Transfer" | "Deposit" | "Withdrawal";
  from: string;
  to: string;
  currency: string;
  amount: number;
  amountUSD: number;
  fee: number;
  feeUSD: number;
  status: "Success" | "Pending" | "Failed";
  date: string;
};

export const transactions: SeedTransaction[] = []; // or your real seed

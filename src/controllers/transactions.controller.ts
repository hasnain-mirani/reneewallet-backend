import type { Request, Response } from "express";
import { exportTransactionsCSVData, listTransactions, transactionStats } from "../services/transactions.service";

export async function getTransactions(req: Request, res: Response) {
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "") as any;
  const type = String(req.query.type || "") as any;
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 10, 100);
  const sort = String(req.query.sort || "date:desc");

  const result = listTransactions({ search, status, type, page, pageSize, sort });
  res.json(result);
}

export async function getTransactionStats(req: Request, res: Response) {
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "") as any;
  const type = String(req.query.type || "") as any;

  res.json(transactionStats({ search, status, type }));
}

export async function exportTransactionsCSV(req: Request, res: Response) {
  const search = String(req.query.search || "").trim();
  const status = String(req.query.status || "") as any;
  const type = String(req.query.type || "") as any;
  const sort = String(req.query.sort || "date:desc");

  const csv = exportTransactionsCSVData({ search, status, type, sort });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="transactions_${new Date().toISOString()}.csv"`
  );
  res.status(200).send(csv);
}

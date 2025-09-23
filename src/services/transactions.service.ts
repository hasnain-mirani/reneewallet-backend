import { transactions as TX } from "../data";

export type TxStatus = "Success" | "Pending" | "Failed";
export type TxType = "Transfer" | "Deposit" | "Withdrawal";

function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(page, 1), pageCount);
  const start = (p - 1) * pageSize;
  const end = start + pageSize;
  return { items: rows.slice(start, end), meta: { total, page: p, pageSize, pageCount } };
}

export function listTransactions(params: {
  search: string;
  status?: TxStatus | "";
  type?: TxType | "";
  page: number;
  pageSize: number;
  sort: string; // date:desc | date:asc
}) {
  const { search, status = "", type = "", page, pageSize, sort } = params;

  let rows = [...TX];

  // filter
  const s = search.toLowerCase();
  if (s) {
    rows = rows.filter(
      (t) =>
        t.hash.toLowerCase().includes(s) ||
        t.currency.toLowerCase().includes(s) ||
        t.from.toLowerCase().includes(s) ||
        t.to.toLowerCase().includes(s)
    );
  }
  if (status) rows = rows.filter((t) => t.status === status);
  if (type) rows = rows.filter((t) => t.type === type);

  // sort
  const dir = sort.endsWith(":asc") ? "asc" : "desc";
  rows = rows.sort((a, b) =>
    dir === "asc" ? +new Date(a.date) - +new Date(b.date) : +new Date(b.date) - +new Date(a.date)
  );

  return paginate(rows, page, pageSize);
}

export function transactionStats(params: { search: string; status?: TxStatus | ""; type?: TxType | "" }) {
  const { search, status = "", type = "" } = params;
  let rows = [...TX];

  const s = search.toLowerCase();
  if (s) {
    rows = rows.filter(
      (t) =>
        t.hash.toLowerCase().includes(s) ||
        t.currency.toLowerCase().includes(s) ||
        t.from.toLowerCase().includes(s) ||
        t.to.toLowerCase().includes(s)
    );
  }
  if (status) rows = rows.filter((t) => t.status === status);
  if (type) rows = rows.filter((t) => t.type === type);

  const total = rows.length;
  const success = rows.filter((t) => t.status === "Success").length;
  const pending = rows.filter((t) => t.status === "Pending").length;
  const totalVolumeUSD = rows.reduce((sum, t) => sum + t.amountUSD, 0);

  return { total, success, pending, totalVolumeUSD };
}

export function exportTransactionsCSVData(params: {
  search: string;
  status?: TxStatus | "";
  type?: TxType | "";
  sort: string;
}) {
  const { search, status = "", type = "", sort } = params;
  const { items } = listTransactions({ search, status, type, page: 1, pageSize: Number.MAX_SAFE_INTEGER, sort });

  const header = [
    "id",
    "hash",
    "type",
    "from",
    "to",
    "currency",
    "amount",
    "amountUSD",
    "fee",
    "feeUSD",
    "status",
    "date",
  ].join(",");

  const rows = items.map((t) =>
    [
      t.id,
      t.hash,
      t.type,
      t.from,
      t.to,
      t.currency,
      t.amount,
      t.amountUSD,
      t.fee,
      t.feeUSD,
      t.status,
      t.date,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header, ...rows].join("\n");
}

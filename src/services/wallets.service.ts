
export type WalletStatus = "Active" | "Frozen";

export type Wallet = {
  id: string;
  address: string;
  userName: string;
  currency: "USDT" | "USDC" | "BTC" | "ETH" | string;
  balance: number;         // native units
  balanceUSD: number;      // USD
  status: WalletStatus;
  lastTransaction: string; // ISO timestamp
};

// ---------- seed (replace with DB as needed) ----------
const randOf = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const randomHex = (len: number) =>
  Array.from({ length: len }, () => "abcdef0123456789"[Math.floor(Math.random() * 16)]).join("");

const WALLETS: Wallet[] = Array.from({ length: 120 }).map((_, i) => {
  const currency = randOf(["USDT", "USDC", "BTC", "ETH"]) as Wallet["currency"];
  const balance =
    currency === "BTC" || currency === "ETH"
      ? Number((Math.random() * 2).toFixed(6))
      : Number((Math.random() * 2000).toFixed(2));
  const usdRate =
    currency === "BTC" ? 60_000 : currency === "ETH" ? 3_000 : 1; // rough demo rates
  const balanceUSD = Math.round(balance * usdRate * (currency === "USDT" || currency === "USDC" ? 1 : 100)) / (currency === "USDT" || currency === "USDC" ? 1 : 100);

  return {
    id: `wal_${i + 1}`,
    address: `0x${randomHex(40)}`,
    userName: `User ${1 + (i % 80)}`,
    currency,
    balance,
    balanceUSD: Math.max(10, Math.round(balanceUSD)), // keep it nice for UI
    status: randOf<WalletStatus>(["Active", "Frozen"]),
    lastTransaction: daysAgo(Math.floor(Math.random() * 21)), // within 3 weeks
  };
});

// ---------- helpers ----------
function paginate<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(page, 1), pageCount);
  const start = (p - 1) * pageSize;
  const end = start + pageSize;
  return { items: rows.slice(start, end), meta: { total, page: p, pageSize, pageCount } };
}

function sortBy<T>(arr: T[], key: keyof T, dir: "asc" | "desc") {
  const copy = [...arr];
  copy.sort((a: any, b: any) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
  return copy;
}

// ---------- queries ----------
export function queryWallets(params: {
  search: string;
  page: number;
  pageSize: number;
  sort: string; // e.g., "lastTransaction:desc"
}) {
  const { search, page, pageSize, sort } = params;

  let rows = [...WALLETS];

  // search by userName, currency, address (case-insensitive)
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (w) =>
        w.userName.toLowerCase().includes(s) ||
        w.currency.toLowerCase().includes(s) ||
        w.address.toLowerCase().includes(s)
    );
  }

  // sorting
  const [rawKey, rawDir] = (sort.includes(":") ? sort.split(":") : [sort, "desc"]) as [
    keyof Wallet | string,
    "asc" | "desc"
  ];
  const key = ([
    "id",
    "address",
    "userName",
    "currency",
    "balance",
    "balanceUSD",
    "status",
    "lastTransaction",
  ] as (keyof Wallet)[]).includes(rawKey as keyof Wallet)
    ? (rawKey as keyof Wallet)
    : "lastTransaction";
  const dir = rawDir === "asc" ? "asc" : "desc";

  // special date sort
  if (key === "lastTransaction") {
    rows = [...rows].sort((a, b) =>
      dir === "asc"
        ? +new Date(a.lastTransaction) - +new Date(b.lastTransaction)
        : +new Date(b.lastTransaction) - +new Date(a.lastTransaction)
    );
  } else {
    rows = sortBy(rows, key, dir);
  }

  return paginate(rows, page, pageSize);
}

export function getWalletStats() {
  const total = WALLETS.length;
  const active = WALLETS.filter((w) => w.status === "Active").length;
  const totalValueUSD = WALLETS.reduce((sum, w) => sum + (Number.isFinite(w.balanceUSD) ? w.balanceUSD : 0), 0);
  return { total, active, totalValueUSD };
}

export function setWalletStatus(id: string, status: WalletStatus) {
  const idx = WALLETS.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  WALLETS[idx] = { ...WALLETS[idx], status };
  return true;
}

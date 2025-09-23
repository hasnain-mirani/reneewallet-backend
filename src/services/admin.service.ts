import { v4 as uuid } from "uuid";

// ---------- Types ----------
export type UserStatus = "Active" | "Inactive" | "Suspended";
export type UserRole = "Admin" | "Manager" | "Viewer" | "VIP User";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  walletCount: number;
  totalBalance: number;
  createdAt: string; // ISO
};

export type TxStatus = "Success" | "Pending" | "Failed";
export type Transaction = {
  id: string;
  hash: string;
  amount: number;
  amountUSD: number;
  currency: string;
  status: TxStatus;
  date: string; // ISO
};

// ---------- Seed data (replace with DB) ----------
const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();

const USERS: User[] = Array.from({ length: 120 }).map((_, i) => ({
  id: uuid(),
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: rand<UserRole>(["Admin", "Manager", "Viewer", "VIP User"]),
  status: rand<UserStatus>(["Active", "Inactive", "Suspended"]),
  walletCount: Math.floor(Math.random() * 5),
  totalBalance: Math.round(Math.random() * 50_000),
  createdAt: daysAgo(1 + Math.floor(Math.random() * 365)),
}));

const TX: Transaction[] = Array.from({ length: 200 }).map(() => {
  const amount = Number((Math.random() * 5).toFixed(4));
  const amountUSD = Math.round(amount * (1000 + Math.random() * 2000));
  return {
    id: uuid(),
    hash: uuid().replace(/-/g, "").slice(0, 48),
    amount,
    amountUSD,
    currency: rand(["USDT", "USDC", "BTC", "ETH"]),
    status: rand<TxStatus>(["Success", "Pending", "Failed"]),
    date: daysAgo(Math.floor(Math.random() * 14)),
  };
});

const MONTHS = Array.from({ length: 12 }).map((_, i) =>
  new Date(new Date().getFullYear(), i).toLocaleString("en-US", { month: "short" })
);

const USER_GROWTH = MONTHS.map((month, i) => ({
  month,
  users: 1000 + i * 250 + Math.floor(Math.random() * 120),
}));

const WALLET_BALANCES = MONTHS.map((month, i) => ({
  month,
  balance: 2_000_000 + i * 180_000 + Math.floor(Math.random() * 50_000),
}));

// ---------- Helpers ----------
function formatUSD(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

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

// ---------- Dashboard ----------
export function getDashboardData() {
  const totalUsers = USERS.length;
  const activeWallets = USERS.reduce(
    (sum, u) => sum + (u.status === "Active" ? u.walletCount : 0),
    0
  );

  const t24 = Date.now() - 24 * 60 * 60 * 1000;
  const tx24h = TX.filter((t) => new Date(t.date).getTime() >= t24);
  const dailyVolumeUSD = tx24h.reduce((sum, t) => sum + t.amountUSD, 0);
  const totalRevenueUSD = Math.round(dailyVolumeUSD * 0.0025);

  const sevenDaysAgo = Date.now() - 7 * 864e5;
  const recent = TX.filter((t) => new Date(t.date).getTime() >= sevenDaysAgo);
  const success = recent.filter((t) => t.status === "Success").length;
  const pending = recent.filter((t) => t.status === "Pending").length;
  const failed = recent.filter((t) => t.status === "Failed").length;

  return {
    kpis: {
      totalUsers: { value: totalUsers, change: "+2.1%", trend: "up" as const },
      activeWallets: { value: activeWallets, change: "+1.3%", trend: "up" as const },
      dailyVolume: { value: formatUSD(dailyVolumeUSD), change: "-0.8%", trend: "down" as const },
      totalRevenue: { value: formatUSD(totalRevenueUSD), change: "+4.7%", trend: "up" as const },
    },
    userGrowth: USER_GROWTH,
    walletBalances: WALLET_BALANCES,
    transactionStatus: [
      { name: "Success" as const, value: success },
      { name: "Pending" as const, value: pending },
      { name: "Failed" as const, value: failed },
    ],
  };
}

export function getRecentTx(limit: number) {
  return [...TX]
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
}

// ---------- Users ----------
export function queryUsers(params: {
  search: string;
  page: number;
  pageSize: number;
  sort: string; // "createdAt:desc"
}) {
  const { search, page, pageSize, sort } = params;

  let rows = [...USERS];
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }

  const [sortKeyRaw, sortDirRaw] = (sort.includes(":") ? sort.split(":") : [sort, "desc"]) as [
    keyof User,
    "asc" | "desc"
  ];
  const sortKey: keyof User = (["name", "email", "role", "status", "walletCount", "totalBalance", "createdAt"].includes(sortKeyRaw as string)
    ? sortKeyRaw
    : "createdAt") as keyof User;
  const sortDir = (sortDirRaw === "asc" ? "asc" : "desc") as "asc" | "desc";

  rows = sortBy(rows, sortKey, sortDir);

  return paginate(rows, page, pageSize);
}

export function getStats() {
  const total = USERS.length;
  const active = USERS.filter((u) => u.status === "Active").length;
  const vip = USERS.filter((u) => u.role === "VIP User").length;
  return { total, active, vip };
}

export function removeUser(id: string) {
  const idx = USERS.findIndex((u) => u.id === id);
  if (idx === -1) return false;
  USERS.splice(idx, 1);
  return true;
}
export function createUserRecord(input: {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  walletCount: number;
  totalBalance: number;
}) {
  const u: User = {
    id: uuid(),
    name: input.name,
    email: input.email,
    role: input.role,
    status: input.status,
    walletCount: input.walletCount,
    totalBalance: input.totalBalance,
    createdAt: new Date().toISOString(),
  };
  USERS.unshift(u);
  return u;
}

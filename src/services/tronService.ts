// src/services/tronService.ts
import TronWeb from "tronweb";
import axios from "axios";
import { config } from "../config/env";
import { logger } from "../utils/logger";

/* -------------------------- Helpers (robust) -------------------------- */
// Accept both Base58 (T...) and Hex41 (41...)
function isTronAddress(address: unknown): boolean {
  const a = String(address ?? "").trim();
  if (!a) return false;
  try {
    if (TronWeb.isAddress(a)) return true;               // Base58 T...
    if (/^41[a-fA-F0-9]{40}$/.test(a)) return true;      // Hex41
    return false;
  } catch {
    return false;
  }
}

// T... or 41... -> Base58 (T...)
function toBase58(address: unknown): string {
  const a = String(address ?? "").trim();
  if (!a) throw new Error("Empty TRON address");
  if (a.startsWith("T")) return a;
  if (a.startsWith("41")) return TronWeb.address.fromHex(a);
  throw new Error(`Invalid TRON address for toBase58: ${a}`);
}

// T... or 41... -> Hex41 (41...)
function toHex41(address: unknown): string {
  const a = String(address ?? "").trim();
  if (!a) throw new Error("Empty TRON address");
  if (a.startsWith("41")) return a;
  if (a.startsWith("T")) return TronWeb.address.toHex(a);
  throw new Error(`Invalid TRON address for toHex41: ${a}`);
}

/* ---------- amount helpers (human <-> smallest units) ---------- */
function toSmallestUnits(amountHuman: string | number, decimals: number): string {
  const s = typeof amountHuman === "number" ? amountHuman.toString() : (amountHuman || "0").toString();
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid amount");
  const [int, frac = ""] = s.split(".");
  const fracPad = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(int + fracPad).toString();
}
function fromSmallestUnits(amountRaw: string | number | bigint, decimals: number): number {
  const raw = BigInt(amountRaw.toString());
  const base = BigInt(10) ** BigInt(decimals);
  const int = Number(raw / base);
  const frac = Number(raw % base) / Number(base);
  return int + frac;
}

/* --------------------------- TronWeb clients -------------------------- */
const HttpProvider = TronWeb.providers.HttpProvider;
const host = config.tron.host.replace(/\/$/, ""); // normalize
const headers = config.tron.apiKey ? { "TRON-PRO-API-KEY": config.tron.apiKey } : undefined;

const fullNode = new HttpProvider(host, 30000, undefined, undefined, headers);
const solidityNode = new HttpProvider(host, 30000, undefined, undefined, headers);
const eventServer = host;

export const tronWeb = new TronWeb(
  fullNode,
  solidityNode,
  eventServer,
  config.tron.senderPrivateKey || undefined
);

// TronGrid (history). If you have a separate gridHost, use it; else fallback to host.
const gridBase = (config.tron.gridHost?.replace(/\/$/, "") as string) || host;
const tronGrid = axios.create({ baseURL: gridBase, timeout: 30000, headers });

/* ------------------------------ Service ------------------------------ */
export const tronService = {
  isAddress: (a: unknown) => isTronAddress(a),

  async getTrxBalance(addressAny: unknown) {
    if (!isTronAddress(addressAny)) throw new Error("Invalid TRON address");
    const base58 = toBase58(addressAny);
    const balanceSun = await tronWeb.trx.getBalance(base58);
    return { balanceSun, balanceTRX: balanceSun / 1_000_000 };
  },

  async getAccountResources(addressAny: unknown) {
    if (!isTronAddress(addressAny)) throw new Error("Invalid TRON address");
    const base58 = toBase58(addressAny);
    return tronWeb.trx.getAccountResources(base58);
  },

  /** TRC-20 meta */
  async getTrc20Meta(tokenAddressAny: unknown) {
    if (!isTronAddress(tokenAddressAny)) throw new Error("Invalid TRON address");
    const tokenHex = toHex41(tokenAddressAny);
    const c = await tronWeb.contract().at(tokenHex);

    let name = "Unknown", symbol = "UNK", decimals = 6;
    try { const v = await c.name().call(); name = v?.toString?.() ?? String(v); } catch {}
    try { const v = await c.symbol().call(); symbol = v?.toString?.() ?? String(v); } catch {}
    try { const v = await c.decimals().call(); decimals = Number(v?.toString?.() ?? v); } catch {}

    return { name, symbol, decimals };
  },

  /** TRC-20 balance */
  async getTrc20Balance(tokenAddressAny: unknown, holderAny: unknown) {
    if (!isTronAddress(tokenAddressAny) || !isTronAddress(holderAny)) {
      throw new Error("Invalid TRON address");
    }
    const tokenHex = toHex41(tokenAddressAny);
    const holderBase58 = toBase58(holderAny);

    const contract = await tronWeb.contract().at(tokenHex);
    const raw = await contract.balanceOf(holderBase58).call();

    let decimals = 6;
    try {
      const d = await contract.decimals().call();
      decimals = Number(d?.toString?.() ?? d);
    } catch {}

    const rawStr =
      (raw && typeof raw.toString === "function")
        ? raw.toString()
        : tronWeb.toBigNumber(raw).toString(10);

    const balance = Number(rawStr) / 10 ** decimals;
    return { raw: rawStr, decimals, balance };
  },

  /** TRC-20 history via TronGrid (address must be Base58) */
  async getTrc20Transfers(addressAny: unknown, limit = 20, fingerprint?: string) {
    if (!isTronAddress(addressAny)) throw new Error("Invalid TRON address");
    const base58 = toBase58(addressAny);

    const params: Record<string, any> = { limit };
    if (fingerprint) params.fingerprint = fingerprint;

    const url = `/v1/accounts/${base58}/transactions/trc20`;
    const { data, status } = await tronGrid.get(url, { params });
    if (status !== 200) throw new Error(`TronGrid ${status}`);
    return data;
  },

  /** TRC-20 transfer (amountRaw = smallest units) */
  async transferTrc20(
    tokenAddressAny: unknown,
    toAny: unknown,
    amountRaw: string | number,
    opts?: { privateKey?: string; feeLimitSun?: number }
  ) {
    if (!isTronAddress(tokenAddressAny) || !isTronAddress(toAny)) {
      throw new Error("Invalid TRON address");
    }
    const tokenHex = toHex41(tokenAddressAny);
    const toBase58Addr = toBase58(toAny);

    const privateKey = opts?.privateKey || config.tron.senderPrivateKey;
    if (!privateKey) {
      throw new Error("No private key configured. Set TRON_SENDER_PRIVATE_KEY or pass opts.privateKey.");
    }

    const localTW = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
    const contract = await localTW.contract().at(tokenHex);
    const amountStr = typeof amountRaw === "number" ? String(amountRaw) : (amountRaw || "").toString();

    const txId = await contract.transfer(toBase58Addr, amountStr).send({
      feeLimit: opts?.feeLimitSun ?? config.tron.feeLimitSun,
    });

    logger.info({ tx: txId }, "TRC20 transfer broadcasted");
    return { txId };
  },

  /** Approve (spender gets allowance) */
  async approveTrc20(
    tokenAddressAny: unknown,
    spenderAny: unknown,
    amountRaw: string | number,
    opts?: { privateKey?: string; feeLimitSun?: number }
  ) {
    if (!isTronAddress(tokenAddressAny) || !isTronAddress(spenderAny)) throw new Error("Invalid TRON address");
    const tokenHex = toHex41(tokenAddressAny);
    const spender = toBase58(spenderAny);

    const pk = opts?.privateKey || config.tron.senderPrivateKey;
    if (!pk) throw new Error("Missing TRON_SENDER_PRIVATE_KEY");

    const localTW = new TronWeb(fullNode, solidityNode, eventServer, pk);
    const c = await localTW.contract().at(tokenHex);
    const txId = await c.approve(spender, String(amountRaw)).send({
      feeLimit: opts?.feeLimitSun ?? config.tron.feeLimitSun,
    });
    logger.info({ txId }, "TRC20 approve sent");
    return { txId };
  },

  /** Allowance(owner->spender) */
  async allowanceTrc20(tokenAddressAny: unknown, ownerAny: unknown, spenderAny: unknown) {
    if (!isTronAddress(tokenAddressAny) || !isTronAddress(ownerAny) || !isTronAddress(spenderAny)) {
      throw new Error("Invalid TRON address");
    }
    const tokenHex = toHex41(tokenAddressAny);
    const owner = toBase58(ownerAny);
    const spender = toBase58(spenderAny);
    const c = await tronWeb.contract().at(tokenHex);
    const raw = await c.allowance(owner, spender).call();
    const rawStr = raw?.toString?.() ?? tronWeb.toBigNumber(raw).toString(10);
    return { raw: rawStr };
  },

  /** transferFrom (spender moves funds from owner to recipient) */
  async transferFromTrc20(
    tokenAddressAny: unknown, fromAny: unknown, toAny: unknown, amountRaw: string | number,
    opts?: { privateKey?: string; feeLimitSun?: number }
  ) {
    if (!isTronAddress(tokenAddressAny) || !isTronAddress(fromAny) || !isTronAddress(toAny)) throw new Error("Invalid TRON address");

    const tokenHex = toHex41(tokenAddressAny);
    const from = toBase58(fromAny);
    const to = toBase58(toAny);
    const pk = opts?.privateKey || config.tron.senderPrivateKey;
    if (!pk) throw new Error("Missing TRON_SENDER_PRIVATE_KEY");

    const localTW = new TronWeb(fullNode, solidityNode, eventServer, pk);
    const c = await localTW.contract().at(tokenHex);
    const txId = await c.transferFrom(from, to, String(amountRaw)).send({
      feeLimit: opts?.feeLimitSun ?? config.tron.feeLimitSun,
    });
    logger.info({ txId }, "TRC20 transferFrom sent");
    return { txId };
  },

  /** Activate address by sending a small TRX amount (default 1 TRX) */
  async activateAddress(toAny: unknown, opts?: { amountSun?: number; privateKey?: string }) {
    if (!isTronAddress(toAny)) throw new Error("Invalid TRON address");
    const to = toBase58(toAny);

    const privateKey = opts?.privateKey || config.tron.senderPrivateKey;
    if (!privateKey) throw new Error("No private key configured. Set TRON_SENDER_PRIVATE_KEY or pass opts.privateKey.");

    const from = tronWeb.address.fromPrivateKey(privateKey);
    const sendAmount = opts?.amountSun ?? 1_000_000; // 1 TRX

    const tx = await tronWeb.transactionBuilder.sendTrx(to, sendAmount, from);
    const signed = await tronWeb.trx.sign(tx, privateKey);
    const receipt = await tronWeb.trx.sendRawTransaction(signed);

    logger.info({ receipt }, "Address activation transaction broadcasted");
    return receipt;
  },

  // export helpers if you want to reuse them in routes
  toSmallestUnits,
  fromSmallestUnits,
};

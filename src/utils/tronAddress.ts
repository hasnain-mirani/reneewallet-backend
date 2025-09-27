// src/utils/tronAddress.ts
import bs58check from "bs58check";

const HEX41 = /^41[a-fA-F0-9]{40}$/;

export function isHex41(addr: string): boolean {
  return HEX41.test((addr || "").trim());
}

export function isBase58Tron(addr: string): boolean {
  try {
    const payload = bs58check.decode((addr || "").trim());
    // TRON payload = 21 bytes, first byte 0x41
    return payload.length === 21 && payload[0] === 0x41;
  } catch {
    return false;
  }
}

/** Accepts T… or 41… */
export function isTronAddress(addr: string): boolean {
  return isBase58Tron(addr) || isHex41(addr);
}

/** Always return T… form (Base58Check) */
export function toBase58(addr: string): string {
  const s = (addr || "").trim();
  if (isBase58Tron(s)) return s;
  if (!isHex41(s)) throw new Error("Invalid TRON address");
  const buf = Buffer.from(s.toLowerCase(), "hex");
  return bs58check.encode(buf);
}

/** Always return 41… hex form */
export function toHex41(addr: string): string {
  const s = (addr || "").trim();
  if (isHex41(s)) return s.toLowerCase();
  if (!isBase58Tron(s)) throw new Error("Invalid TRON address");
  const decoded = bs58check.decode(s);
  return Buffer.from(decoded).toString("hex").toLowerCase();
}

import { v4 as uuid } from "uuid";

type Profile = { name: string; email: string; timezone?: string };
type Notifications = { emailAlerts: boolean; txAlerts: boolean; weeklyDigest: boolean };
type SystemCfg = { maintenanceMode: boolean; sessionTimeoutMinutes: number };
export type ApiKey = { id: string; name: string; last4: string; createdAt: string; active: boolean };

let PROFILE: Profile = { name: "Admin", email: "admin@example.com", timezone: "Asia/Karachi" };
let NOTIF: Notifications = { emailAlerts: true, txAlerts: true, weeklyDigest: false };
let SYSTEM: SystemCfg = { maintenanceMode: false, sessionTimeoutMinutes: 30 };
const API_KEYS: ApiKey[] = [];  

export function getAllSettings() {
  return { profile: PROFILE, notifications: NOTIF, system: SYSTEM, apiKeys: API_KEYS };
}
export function setProfile(p: Partial<Profile>) {
  PROFILE = { ...PROFILE, ...p };
  return PROFILE;
}
export function setNotifications(n: Partial<Notifications>) {
  NOTIF = { ...NOTIF, ...n };
  return NOTIF;
}
export function setSystem(s: Partial<SystemCfg>) {
  SYSTEM = { ...SYSTEM, ...s };
  if (SYSTEM.sessionTimeoutMinutes < 5) SYSTEM.sessionTimeoutMinutes = 5;
  return SYSTEM;
}

export function listKeys() {
  return API_KEYS;
}
export function createKey(name: string) {
  const raw = uuid().replace(/-/g, "");
  const last4 = raw.slice(-4);
  const item: ApiKey = { id: uuid(), name, last4, createdAt: new Date().toISOString(), active: true };
  API_KEYS.unshift(item);
  // We only return the **plaintext** once
  return { key: raw, item };
}
export function revokeKey(id: string) {
  const idx = API_KEYS.findIndex((k) => k.id === id);
  if (idx === -1) return false;
  API_KEYS[idx].active = false;
  return true;
}

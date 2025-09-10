import TronWeb from "tronweb";
import axios from "axios";
import { config } from "../config/env";
import { logger } from "../utils/logger";

const HttpProvider = TronWeb.providers.HttpProvider;
const headers = config.tron.apiKey ? { "TRON-PRO-API-KEY": config.tron.apiKey } : undefined;

const fullNode = new HttpProvider(config.tron.host, 30000, undefined, undefined, headers);
const solidityNode = new HttpProvider(config.tron.host, 30000, undefined, undefined, headers);
const eventServer = config.tron.host;

export const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, config.tron.senderPrivateKey);

const tronGrid = axios.create({
  baseURL: config.tron.host,
  timeout: 30000,
  headers: headers,
});

export const tronService = {
  isAddress(address: string) {
    return TronWeb.isAddress(address);
  },

  async getTrxBalance(address: string) {
    const balanceSun = await tronWeb.trx.getBalance(address);
    return { balanceSun, balanceTRX: balanceSun / 1_000_000 };
  },

  async getAccountResources(address: string) {
    return await tronWeb.trx.getAccountResources(address);
  },

  async getTrc20Balance(tokenAddress: string, holder: string) {
    const contract = await tronWeb.contract().at(tokenAddress);
    const raw = await contract.balanceOf(holder).call();
    let decimals = 6;
    try {
      decimals = Number(await contract.decimals().call());
    } catch {}
    const rawStr = tronWeb.toBigNumber(raw).toString(10);
    const human = Number(rawStr) / (10 ** decimals);
    return { raw: rawStr, decimals, balance: human };
  },

  async getTrc20Transfers(address: string, limit = 20, fingerprint?: string) {
    const params: any = { limit };
    if (fingerprint) params["fingerprint"] = fingerprint;
    const url = `/v1/accounts/${address}/transactions/trc20`;
    const { data } = await tronGrid.get(url, { params });
    return data;
  },

  async transferTrc20(tokenAddress: string, to: string, amount: string | number, opts?: { privateKey?: string; feeLimitSun?: number }) {
    const privateKey = opts?.privateKey || config.tron.senderPrivateKey;
    if (!privateKey) {
      throw new Error("No private key configured. Provide one in env SENDER_PRIVATE_KEY or request body (server-side only).");
    }

    const localTW = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
    const contract = await localTW.contract().at(tokenAddress);
    const receipt = await contract.transfer(to, amount).send({
      feeLimit: opts?.feeLimitSun ?? config.tron.feeLimitSun,
    });

    logger.info({ tx: receipt }, "TRC20 transfer broadcasted");
    return { txId: receipt };
  },
};
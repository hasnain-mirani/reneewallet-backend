import { Router } from "express";
import {
  getDashboard,
  getRecentTransactions,
  getUsers,
  getUserStats,
  deleteUserById,
  createUser, // NEW
} from "../controllers/admin.controller.js"; // keep .js if you're on NodeNext/ESM
import {
  getWallets,
  getWalletsStats,
  patchWalletStatus,
} from "../controllers/wallets.controller";
import {
  getTransactions,
  getTransactionStats,
  exportTransactionsCSV,
} from "../controllers/transactions.controller";
import { authRequired, requireRole } from "../middleware/auth.js";
import {
  getSettings,
  patchProfile,
  patchNotifications,
  patchSystem,
  getApiKeys,
  postApiKey,
  deleteApiKey,
} from "../controllers/settings.controller.js";
const router = Router();

// Admin dashboard + activity
router.get("/dashboard", authRequired, getDashboard);
router.get("/transactions", authRequired, getRecentTransactions);

// Users
router.get("/users", authRequired, getUsers);
router.get("/users/stats", authRequired, getUserStats);
router.post("/users", authRequired, requireRole("manager", "admin"), createUser); // NEW
router.delete("/users/:id", authRequired, requireRole("manager", "admin"), deleteUserById);

router.get("/wallets", authRequired, getWallets);
router.get("/wallets/stats", authRequired, getWalletsStats);
router.patch("/wallets/:id/status", authRequired, requireRole("manager", "admin"), patchWalletStatus);

// setting routes
router.get("/settings", authRequired, getSettings);
router.patch("/settings/profile", authRequired, patchProfile);
router.patch("/settings/notifications", authRequired, patchNotifications);
router.patch("/settings/system", authRequired, requireRole("manager", "admin"), patchSystem);

// Full transactions list/stats/export
router.get("/transactions/stats", authRequired, getTransactionStats);
router.get("/transactions/export", authRequired, requireRole("manager", "admin"), exportTransactionsCSV);
router.get("/transactions", authRequired, getTransactions); // list with pagination/search/sort
export default router;

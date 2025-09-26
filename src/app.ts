import express from "express";
import cors from "cors";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import marketRoutes from "./routes/marketRoutes";
import healthRoutes from "./routes/healthRoutes";
import tronRoutes from "./routes/tronRoutes";
import rpcRoutes from "./routes/rpcRoutes";
import txRoutes from "./routes/tx";
import adminRoutes from "./routes/adminRoutes";
import { authRequired } from "./middleware/auth";
import { config } from "./config/env";

const app = express();

app.disable("x-powered-by");

// --- CORS ---
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);
app.options("*", cors());

// Body parser
app.use(express.json({ limit: "1mb" }));

// Rate-limit all /api/* routes
app.use("/api", apiLimiter);

// --- ROUTES (under /api) ---
app.use("/api/health", healthRoutes);
app.use("/api/tron", tronRoutes);
app.use("/api/rpc", rpcRoutes);
app.use("/api/tx", txRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/rpc", rpcRoutes);
// Admin (JWT-protected)
app.use("/api/admin", authRequired, adminRoutes);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

export default app;

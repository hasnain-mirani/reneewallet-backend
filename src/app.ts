// src/app.ts
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
import trc20Router from "./routes/trc20";

const app = express();

app.disable("x-powered-by");

// CORS (adjust origin as needed)
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
  })
);
app.options("*", cors());

// Body parser BEFORE routes
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

// Optional debug route to verify JSON parsing
if (process.env.NODE_ENV !== "production") {
  app.post("/debug/body", (req, res) => res.json({ got: req.body, type: typeof req.body }));
}

// Rate-limit all /api/* routes
app.use("/api", apiLimiter);

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/tron", tronRoutes);
app.use("/api/rpc", rpcRoutes);
app.use("/api/tx", txRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/admin", authRequired, adminRoutes);
app.use("/api/trc20", trc20Router);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

export default app;

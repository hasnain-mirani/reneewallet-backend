import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

import healthRoutes from "./routes/healthRoutes";
import tronRoutes from "./routes/tronRoutes";
import rpcRoutes from "./routes/rpcRoutes";
import txRoutes from "./routes/tx";

import adminRoutes from "./routes/adminRoutes";
import { authRequired } from "./middleware/auth";

const app = express();

app.disable("x-powered-by");

// CORS (allow cookies/JWT header if you use them)
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json({ limit: "1mb" }));

// Rate-limit all /api/* routes
app.use("/api", apiLimiter);

// Public/regular routes
app.use("/health", healthRoutes);
app.use("/api/tron", tronRoutes);
app.use("/rpc", rpcRoutes);
app.use("/tx", txRoutes);

// Admin routes (JWT-protected)
// If your adminRoutes already apply auth per-endpoint, you can remove `authRequired` here.
app.use("/api/admin", authRequired, adminRoutes);

// 404 and error handlers MUST be last
app.use(notFound);
app.use(errorHandler);

export default app;

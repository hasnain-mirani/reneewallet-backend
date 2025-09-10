import express from "express";
import cors from "cors";
import { config } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import healthRoutes from "./routes/healthRoutes";
import tronRoutes from "./routes/tronRoutes";

const app = express();

app.disable("x-powered-by");
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use("/health", healthRoutes);
app.use("/api", apiLimiter);
app.use("/api/tron", tronRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
import app from "./app";
import { config } from "./config/env";
import { logger } from "./utils/logger";

const server = app.listen(config.port, () => {
  logger.info(`✅ Server running on port ${config.port} (${config.env})`);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received. Shutting down...");
  server.close(() => process.exit(0));
});
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down...");
  server.close(() => process.exit(0));
});
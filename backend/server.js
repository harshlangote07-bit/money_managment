import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";

import { connectDB, closeDB } from "./db/connection.js";
import plannerRoutes from "./planner/planner.routes.js";
import authRoutes from "./auth/auth.routes.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

// Parse JSON request bodies.
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Basic health check.
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "moneyManagment backend is running."
  });
});

// Register F2 planner endpoints.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/planner", plannerRoutes);

// Handle invalid JSON bodies and other errors.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Request body contains invalid JSON."
    });
  }

  console.error("Unhandled application error:", err.message);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

let server;

async function startServer() {
  try {
    // Connect to the existing SmartPath MongoDB database.
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`moneyManagment backend listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(
        `Planner API: http://localhost:${PORT}/api/v1/planner`
      );
    });
  } catch (error) {
    console.error("Failed to start backend:", error.message);
    await closeDB().catch(() => {});
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down backend...`);

  if (server) {
    server.close(async () => {
      try {
        await closeDB();
      } finally {
        process.exit(0);
      }
    });
  } else {
    await closeDB().catch(() => {});
    process.exit(0);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

if (process.env.NODE_ENV !== "test") {
  startServer();
}

export { app };


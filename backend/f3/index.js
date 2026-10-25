import express from "express";
import f3Routes from "./routes/f3.routes.js";

const router = express.Router();

// F3 module health check.
router.get("/", (req, res) => {
res.status(200).json({
success: true,
module: "F3 Financial Planning",
version: "1.0.0",
message: "F3 module is available."
});
});

// Register all F3 endpoints.
router.use("/", f3Routes);

export default router;

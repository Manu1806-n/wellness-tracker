import express from "express";

const router = express.Router();

/**
 * 🔹 Health Check Route
 */
router.get("/", (req, res) => {
  console.log("✅ Health check endpoint called");
  return res.status(200).json({ status: "ok", message: "Backend running 🚀" });
});

export default router;
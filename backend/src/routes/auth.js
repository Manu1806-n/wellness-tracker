import express from "express";
import admin from "../config/firebase.js";

const router = express.Router();

/**
 * 🔹 Test route (for browser check)
 */
router.get("/test", (req, res) => {
  console.log("🔹 /api/auth/test called");
  res.json({ success: true, route: "/api/auth/test", message: "Auth routes working ✅" });
});

/**
 * 🔹 Sign Up (create a new user with email & password)
 */
router.post("/signup", async (req, res) => {
  console.log("[DEBUG] Signup request body:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required" });
  }

  try {
    const user = await admin.auth().createUser({
      email,
      password,
    });
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { uid: user.uid, email: user.email }
    });
  } catch (err) {
    console.error("[ERROR] Signup failed:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 🔹 Login (get user by email - Firebase client normally handles login,
 * but here we simulate by fetching user details)
 */
router.post("/login", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, error: "Email is required" });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    res.status(200).json({
      success: true,
      message: "Login simulated",
      user: { uid: user.uid, email: user.email }
    });
  } catch (err) {
    console.error("[ERROR] Login failed:", err.message);
    res.status(401).json({ success: false, error: "Login failed: " + err.message });
  }
});

/**
 * 🔹 Verify Firebase Token (used for protected APIs)
 */
router.post("/verify", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: "Token is required" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    res.json({ success: true, user: decoded });
  } catch (err) {
    console.error("[ERROR] Token verification failed:", err.message);
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
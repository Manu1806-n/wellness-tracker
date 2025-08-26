import admin from "../config/firebase.js";

/**
 * 🔹 Middleware: Verify Firebase Token
 */
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[ERROR] Token verification failed:", err.message);
    res.status(401).json({ error: "Invalid token" });
  }
};

export default verifyFirebaseToken;
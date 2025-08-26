import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import wellnessRoutes from "./routes/wellness.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

// CORS configuration
app.use(cors({
  origin: [
    CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5500",
    "https://wellness-tracker-opal.vercel.app",   // Vercel frontend
    "https://wellness-tracker-49up.onrender.com" // Render backend
  ],
  credentials: true
}));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/wellness", wellnessRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("✅ Backend is running 🚀");
});

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log("✅ CORS enabled for: Client origin, http://localhost:5173 and http://127.0.0.1:5500");
});

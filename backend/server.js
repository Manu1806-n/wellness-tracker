// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./src/routes/auth.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
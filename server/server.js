require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// --- 1. CORS Configuration ---
app.use(cors({
  origin: "https://cozy-seahorse-f5aa60.netlify.app", // Your Frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- 2. Middleware ---
app.use(express.json());

// --- 3. Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- 4. Routes ---
try {
  app.use("/api", require("./routes/auth")); 
  app.use("/api/groups", require("./routes/groups")); // <--- NEW: Activates the Group routes
} catch (error) {
  console.error("⚠️ Could not load routes.", error.message);
}

// Test Route
app.get("/", (req, res) => res.send("Server is running!"));

// --- 5. Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

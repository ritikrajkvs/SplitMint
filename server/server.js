require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// 1. CORS Configuration (Allows Frontend to talk to Backend)
app.use(cors({
  origin: "https://cozy-seahorse-f5aa60.netlify.app", // Your Netlify URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2. Middleware
app.use(express.json());

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// 4. Routes (THE CRITICAL PART)
// We wrap in try-catch so if a file is missing, the server logs it instead of crashing
try {
  app.use("/api", require("./routes/auth")); // Login/Signup
  app.use("/api/groups", require("./routes/groups")); // <--- THIS LINE WAS LIKELY MISSING
} catch (error) {
  console.error("⚠️ Route loading error:", error.message);
}

// 5. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

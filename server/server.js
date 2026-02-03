require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// --- 1. CORS Configuration (CRITICAL FIX) ---
// This tells the server to accept requests ONLY from your specific Netlify site.
app.use(cors({
  origin: "https://cozy-seahorse-f5aa60.netlify.app", // Your frontend URL
  credentials: true, // Required for cookies/sessions
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// --- 2. Middleware ---
app.use(express.json()); // Allows the server to read JSON data sent from frontend

// --- 3. Database Connection ---
// This connects to MongoDB using the variable you set in Render Dashboard
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// --- 4. Routes ---
// IMPORTANT: This assumes your route file is located at "./routes/auth.js" 
// and handles "/signup" and "/login".
// If your route file is named differently (e.g., "userRoutes.js"), change the name inside require().
try {
  app.use("/api", require("./routes/auth")); 
} catch (error) {
  console.error("⚠️ Could not load routes. Check if './routes/auth.js' exists.", error.message);
}

// Test Route (To verify server is online)
app.get("/", (req, res) => {
  res.send("Server is running and ready for connections!");
});

// --- 5. Start Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

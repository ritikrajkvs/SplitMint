const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// FIX: Importing 'User' from your Schemas.js file
const { User } = require("../models/Schemas");

// --- SIGNUP ROUTE ---
router.post("/signup", async (req, res) => {
  try {
    console.log("Signup Request:", req.body); // Logs to Render Dashboard

    // 1. Extract Data
    const { name, email, password } = req.body;

    // 2. Validate
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Please provide name, email, and password" });
    }

    // 3. Check for Duplicate Email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Save to Database
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    // 6. Respond
    res.status(201).json({ 
      message: "User created successfully",
      user: { id: newUser._id, name: newUser.name, email: newUser.email }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- LOGIN ROUTE ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    // 2. Check Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // 3. Success
    res.json({
      message: "Login successful",
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;

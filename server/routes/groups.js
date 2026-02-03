const express = require("express");
const router = express.Router();
const { Group } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// GET all groups for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE a new group
router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Group name required" });

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: [req.user._id] // Add creator as first member
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

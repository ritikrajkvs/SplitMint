const express = require("express");
const router = express.Router();
const { Group } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// GET all groups for the dashboard
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single group details (THIS WAS MISSING)
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    
    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Security check: Ensure user is a member
    if (!group.members.some(member => member._id.toString() === req.user._id.toString())) {
       return res.status(403).json({ error: "Not authorized to view this group" });
    }

    res.json(group);
  } catch (error) {
    console.error("Fetch Group Error:", error);
    res.status(500).json({ error: "Server Error" });
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
      members: [req.user._id]
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

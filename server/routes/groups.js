const express = require("express");
const router = express.Router();
const { Group, User, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// GET SINGLE GROUP (Fixes Blank Screen)
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Check if user is a member
    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    // Get expenses
    const expenses = await Expense.find({ group: group._id }).populate("payer", "name").sort({ date: -1 });

    res.json({ group, expenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE GROUP
router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

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

// GET ALL GROUPS
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD MEMBER
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.id);
    if (group.members.length >= 4) return res.status(400).json({ error: "Max 4 members" });
    
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: "User not found" });
    if (group.members.includes(userToAdd._id)) return res.status(400).json({ error: "User already in group" });

    group.members.push(userToAdd._id);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

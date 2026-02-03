const express = require("express");
const router = express.Router();
const { Group, User, Expense } = require("../models/Schemas");
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

// GET Single Group + Expenses
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Check access
    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ error: "Access denied" });

    // Fetch expenses for this group
    const expenses = await Expense.find({ group: group._id })
      .populate("payer", "name")
      .sort({ date: -1 });

    res.json({ group, expenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE Group
router.post("/", protect, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "Name required" });
    
    const group = await Group.create({
      name: req.body.name,
      createdBy: req.user._id,
      members: [req.user._id] // Creator is first member
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD MEMBER
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.id);
    
    // 1. Validations
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.members.length >= 4) return res.status(400).json({ error: "Group limit reached (Max 4)" }); //
    
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ error: "User not found. They must register first." });

    if (group.members.includes(userToAdd._id)) return res.status(400).json({ error: "User already in group" });

    // 2. Add Member
    group.members.push(userToAdd._id);
    await group.save();

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD EXPENSE
router.post("/:id/expenses", protect, async (req, res) => {
  try {
    const { description, amount } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Simple Logic: EQUAL SPLIT for everyone in group
    // In a full app, you would pass specific splits from frontend
    const splitAmount = amount / group.members.length;
    const splits = group.members.map(memberId => ({
      user: memberId,
      amount: splitAmount
    }));

    const expense = await Expense.create({
      description,
      amount,
      payer: req.user._id,
      group: group._id,
      splits
    });

    // Populate payer for immediate UI update
    await expense.populate("payer", "name");
    
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

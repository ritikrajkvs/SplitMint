const express = require("express");
const router = express.Router();
const { Group, User, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// Helper: Simplify Debts (Who pays whom)
const calculateSettlements = (balances) => {
  let debtors = [];
  let creditors = [];

  // Separate into two lists
  Object.keys(balances).forEach(userId => {
    const amount = balances[userId];
    if (amount < -0.01) debtors.push({ id: userId, amount: amount });
    if (amount > 0.01) creditors.push({ id: userId, amount: amount });
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // The amount to settle is the minimum of what debtor owes vs what creditor is owed
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount: parseFloat(amount.toFixed(2))
    });

    // Adjust remaining amounts
    debtor.amount += amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
};

// GET Group Details + Settlements
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email");
    if (!group) return res.status(404).json({ error: "Group not found" });

    const expenses = await Expense.find({ group: group._id })
      .populate("payer", "name")
      .sort({ date: -1 });

    // Calculate Net Balances
    const balances = {};
    group.members.forEach(m => balances[m._id.toString()] = 0);

    expenses.forEach(exp => {
      const payerId = exp.payer._id.toString();
      // Payer gets + (they are owed money)
      if (balances[payerId] !== undefined) balances[payerId] += exp.amount;

      // Splitters get - (they owe money)
      exp.splits.forEach(split => {
        const debtorId = split.user.toString();
        if (balances[debtorId] !== undefined) balances[debtorId] -= split.amount;
      });
    });

    // Generate Settlement Plan
    const settlements = calculateSettlements(balances);

    res.json({ group, expenses, balances, settlements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD EXPENSE (Handles EQUAL, EXACT, PERCENT)
router.post("/:id/expenses", protect, async (req, res) => {
  try {
    const { description, amount, splitType, splits } = req.body; // splits = [{user: id, value: 100}]
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    let finalSplits = [];

    // --- LOGIC FOR SPLIT MODES ---
    if (splitType === 'EQUAL') {
      const share = amount / group.members.length;
      finalSplits = group.members.map(m => ({ user: m._id, amount: share }));
    } 
    else if (splitType === 'EXACT') {
      // Validate total matches
      const total = splits.reduce((acc, curr) => acc + Number(curr.value), 0);
      if (Math.abs(total - amount) > 0.1) return res.status(400).json({ error: "Splits must sum to total amount" });
      
      finalSplits = splits.map(s => ({ user: s.user, amount: Number(s.value) }));
    } 
    else if (splitType === 'PERCENT') {
      const totalPercent = splits.reduce((acc, curr) => acc + Number(curr.value), 0);
      if (Math.abs(totalPercent - 100) > 0.1) return res.status(400).json({ error: "Percentages must equal 100%" });

      finalSplits = splits.map(s => ({ 
        user: s.user, 
        amount: (amount * Number(s.value)) / 100 
      }));
    }

    const expense = await Expense.create({
      description,
      amount,
      payer: req.user._id,
      group: group._id,
      splitType,
      splits: finalSplits
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD MEMBER (Keep existing logic)
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

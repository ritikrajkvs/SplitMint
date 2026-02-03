const express = require("express");
const router = express.Router();
const { Group, User, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// --- BALANCE ENGINE ---
const calculateSettlements = (balances) => {
  let debtors = [];
  let creditors = [];
  
  // Separate users into those who owe (-) and those who are owed (+)
  Object.keys(balances).forEach(userId => {
    const amount = balances[userId];
    if (amount < -0.01) debtors.push({ id: userId, amount: amount }); // Ower
    if (amount > 0.01) creditors.push({ id: userId, amount: amount }); // Lender
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0; 
  let j = 0;

  // Minimize transactions algorithm
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    // Settle the smaller of the two amounts
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    if(amount > 0) {
      settlements.push({
        from: debtor.id,
        to: creditor.id,
        amount: parseFloat(amount.toFixed(2))
      });
    }

    debtor.amount += amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
};

// --- ROUTES ---

// 1. GET ALL GROUPS
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });
    res.json(groups);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. GET SINGLE GROUP (With Balances & Settlements)
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members", "name email avatarColor");
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Auth Check
    if (!group.members.some(m => m._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expenses = await Expense.find({ group: group._id })
      .populate("payer", "name")
      .sort({ date: -1 });

    // Calculate Net Balances
    const balances = {};
    group.members.forEach(m => balances[m._id.toString()] = 0);

    expenses.forEach(exp => {
      const payerId = exp.payer._id.toString();
      if (balances[payerId] !== undefined) balances[payerId] += exp.amount; // Payer gets credit

      exp.splits.forEach(split => {
        const debtorId = split.user.toString();
        if (balances[debtorId] !== undefined) balances[debtorId] -= split.amount; // Splitter gets debt
      });
    });

    const settlements = calculateSettlements(balances);

    res.json({ group, expenses, balances, settlements });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. CREATE GROUP
router.post("/", protect, async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "Name required" });
    const group = await Group.create({
      name: req.body.name,
      createdBy: req.user._id,
      members: [req.user._id]
    });
    res.status(201).json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. ADD EXPENSE (Handles Rounding & Split Modes)
router.post("/:id/expenses", protect, async (req, res) => {
  try {
    const { description, amount, splitType, splits } = req.body;
    const group = await Group.findById(req.params.id);
    
    let finalSplits = [];
    let parsedAmount = parseFloat(amount);

    if (splitType === 'EQUAL') {
      const count = group.members.length;
      // Requirement: Consistent Rounding
      let share = Math.floor((parsedAmount / count) * 100) / 100; // Floor to 2 decimals
      let remainder = parsedAmount - (share * count);

      finalSplits = group.members.map((m, index) => ({
        user: m._id,
        amount: index === 0 ? share + remainder : share // Give pennies to first person
      }));
    } 
    else if (splitType === 'EXACT') {
      finalSplits = splits.map(s => ({ user: s.user, amount: Number(s.value) }));
    } 
    else if (splitType === 'PERCENT') {
      finalSplits = splits.map(s => ({ 
        user: s.user, 
        amount: (parsedAmount * Number(s.value)) / 100 
      }));
    }

    const expense = await Expense.create({
      description,
      amount: parsedAmount,
      payer: req.user._id,
      group: group._id,
      splitType,
      splits: finalSplits
    });

    res.status(201).json(expense);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. DELETE EXPENSE
router.delete("/expenses/:expenseId", protect, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.expenseId);
    res.json({ message: "Expense deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. ADD MEMBER
router.post("/:id/members", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    // Requirement: Max 3 participants + Primary = 4 Total
    if (group.members.length >= 4) return res.status(400).json({ error: "Group is full (Max 4)" });

    const userToAdd = await User.findOne({ email: req.body.email });
    if (!userToAdd) return res.status(404).json({ error: "User not found" });
    if (group.members.includes(userToAdd._id)) return res.status(400).json({ error: "Already a member" });

    group.members.push(userToAdd._id);
    await group.save();
    res.json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 7. REMOVE MEMBER (Requirement: Linked Expense Handling)
router.delete("/:id/members/:userId", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    // Check if user is part of any expenses in this group
    const hasExpenses = await Expense.findOne({ 
      group: group._id, 
      $or: [{ payer: req.params.userId }, { "splits.user": req.params.userId }]
    });

    if (hasExpenses) {
      return res.status(400).json({ error: "Cannot remove member with active expenses. Settle up first." });
    }

    group.members = group.members.filter(m => m.toString() !== req.params.userId);
    await group.save();
    res.json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 8. DELETE GROUP (Requirement: Cascade Handling)
router.delete("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only admin can delete group" });
    }
    await Expense.deleteMany({ group: req.params.id }); // Cascade delete expenses
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: "Group and all expenses deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;

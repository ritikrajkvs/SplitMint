const express = require("express");
const router = express.Router();
const { Group, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// --- SMART COLOR SYSTEM ---
const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-600", "bg-lime-600",
  "bg-green-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
  "bg-pink-500", "bg-rose-500", "bg-slate-500"
];

const getUniqueColor = (existingMembers) => {
  const usedColors = existingMembers.map(m => m.avatarColor);
  const available = AVATAR_COLORS.filter(c => !usedColors.includes(c));
  
  // Pick from unused colors, otherwise fallback to random
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

// --- BALANCE ENGINE ---
const calculateSettlements = (balances) => {
  let debtors = [];
  let creditors = [];
  
  Object.keys(balances).forEach(id => {
    const amount = balances[id];
    if (amount < -0.01) debtors.push({ id, amount });
    if (amount > 0.01) creditors.push({ id, amount });
  });

  debtors.sort((a, b) => a.amount - b.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0; let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

    if (amount > 0) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: parseFloat(amount.toFixed(2)) });
    }

    debtor.amount += amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
};

// --- ROUTES ---

// 1. GET SINGLE GROUP
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Access denied" });
    }

    const expenses = await Expense.find({ group: group._id }).sort({ date: -1 });

    const balances = {};
    group.members.forEach(m => balances[m._id.toString()] = 0);

    expenses.forEach(exp => {
      if (balances[exp.payer] !== undefined) balances[exp.payer] += exp.amount;
      exp.splits.forEach(s => {
        if (balances[s.user] !== undefined) balances[s.user] -= s.amount;
      });
    });

    const settlements = calculateSettlements(balances);

    const enrichedExpenses = expenses.map(exp => {
      const payerName = group.members.find(m => m._id.toString() === exp.payer)?.name || "Unknown";
      return { ...exp.toObject(), payerName };
    });

    res.json({ group, expenses: enrichedExpenses, balances, settlements });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. CREATE GROUP
router.post("/", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    // Admin gets a random unique color too
    const adminColor = getUniqueColor([]); 

    const group = await Group.create({
      name,
      createdBy: req.user._id,
      members: [{
        name: "You",
        isAdmin: true,
        avatarColor: adminColor
      }]
    });
    res.status(201).json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. ADD MEMBER (Distinct Color)
router.post("/:id/members", protect, async (req, res) => {
  try {
    const { name } = req.body;
    const group = await Group.findById(req.params.id);
    
    if (group.members.length >= 4) return res.status(400).json({ error: "Group is full (Max 4)" });
    
    // SMART COLOR SELECTION
    const newColor = getUniqueColor(group.members);

    group.members.push({ name, avatarColor: newColor });
    await group.save();
    res.json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. EDIT MEMBER
router.put("/:id/members/:memberId", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    const member = group.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });

    member.name = req.body.name;
    await group.save();
    res.json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 5. REMOVE MEMBER
router.delete("/:id/members/:memberId", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    const hasExpenses = await Expense.findOne({ 
      group: group._id, 
      $or: [{ payer: req.params.memberId }, { "splits.user": req.params.memberId }]
    });

    if (hasExpenses) return res.status(400).json({ error: "User has linked expenses." });

    group.members.pull({ _id: req.params.memberId });
    await group.save();
    res.json(group);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 6. ADD EXPENSE
router.post("/:id/expenses", protect, async (req, res) => {
  try {
    const { description, amount, splitType, splits, payer } = req.body;
    const group = await Group.findById(req.params.id);
    
    const payerId = payer || group.members[0]._id.toString();
    const total = parseFloat(amount);

    let finalSplits = [];
    
    if (splitType === 'EQUAL') {
      const count = group.members.length;
      let share = Math.floor((total / count) * 100) / 100;
      let remainder = total - (share * count);
      
      finalSplits = group.members.map((m, i) => ({
        user: m._id.toString(),
        amount: i === 0 ? share + remainder : share
      }));
    } else if (splitType === 'EXACT') {
      finalSplits = splits.map(s => ({ user: s.user, amount: Number(s.value) }));
    } else if (splitType === 'PERCENT') {
      finalSplits = splits.map(s => ({ 
        user: s.user, 
        amount: (total * Number(s.value)) / 100 
      }));
    }

    const expense = await Expense.create({
      description, amount: total, payer: payerId, group: group._id, splitType, splits: finalSplits
    });
    res.status(201).json(expense);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 7. GET GROUPS
router.get("/", protect, async (req, res) => {
  try {
    const groups = await Group.find({ createdBy: req.user._id });
    res.json(groups);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 8. HELPERS
router.delete("/expenses/:id", protect, async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.delete("/:id", protect, async (req, res) => {
  await Expense.deleteMany({ group: req.params.id });
  await Group.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;

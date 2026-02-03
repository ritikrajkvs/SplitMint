const express = require("express");
const router = express.Router();
const { Group, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// --- 🤖 MINTSENSE AI ENGINE (Rule-Based NLP) ---
const mintSenseParser = (text, members) => {
  const lowerText = text.toLowerCase();
  
  // 1. Extract Amount (First number found)
  const amountMatch = text.match(/(\d+(\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

  // 2. Extract Payer (Match against member names)
  let payer = members[0]._id.toString(); // Default to first member
  let payerName = members[0].name;
  
  // Sort members by name length desc to match "Alice Smith" before "Alice"
  const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
  
  for (const m of sortedMembers) {
    if (lowerText.includes(m.name.toLowerCase())) {
      payer = m._id.toString();
      payerName = m.name;
      break;
    }
  }

  // 3. Auto-Categorize
  const keywords = {
    "Food": ["pizza", "burger", "lunch", "dinner", "breakfast", "coffee", "tea", "snacks", "drink", "food", "restaurant"],
    "Travel": ["uber", "ola", "cab", "taxi", "bus", "train", "flight", "ticket", "fuel", "petrol", "diesel"],
    "Entertainment": ["movie", "film", "cinema", "netflix", "game", "bowling", "concert", "show"],
    "Utilities": ["bill", "rent", "electricity", "wifi", "recharge", "mobile"],
    "Shopping": ["grocery", "clothes", "shoe", "mall", "market"]
  };
  
  let category = "General";
  for (const cat in keywords) {
    if (keywords[cat].some(k => lowerText.includes(k))) {
      category = cat;
      break;
    }
  }

  // 4. Clean Description (Remove amount, payer, and filler words)
  let description = text
    .replace(new RegExp(amount, 'g'), '') // Remove amount
    .replace(new RegExp(payerName, 'gi'), '') // Remove payer name
    .replace(/\b(paid|by|for|at|in|on)\b/gi, '') // Remove filler words
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();

  // If description became empty (e.g. input was just "Pizza 500"), use Category
  if (description.length < 2) description = category;

  // Capitalize first letter
  description = description.charAt(0).toUpperCase() + description.slice(1);

  return { description, amount, payer, category };
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
    if (amount > 0) settlements.push({ from: debtor.id, to: creditor.id, amount: parseFloat(amount.toFixed(2)) });
    debtor.amount += amount;
    creditor.amount -= amount;
    if (Math.abs(debtor.amount) < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  return settlements;
};

// --- ROUTES ---

// 1. GET GROUP
router.get("/:id", protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy.toString() !== req.user._id.toString()) return res.status(403).json({ error: "Access denied" });

    const expenses = await Expense.find({ group: group._id }).sort({ date: -1 });
    const balances = {};
    group.members.forEach(m => balances[m._id.toString()] = 0);

    expenses.forEach(exp => {
      if (balances[exp.payer] !== undefined) balances[exp.payer] += exp.amount;
      exp.splits.forEach(s => {
        if (balances[s.user] !== undefined) balances[s.user] -= s.amount;
      });
    });

    const enrichedExpenses = expenses.map(exp => {
      const payerName = group.members.find(m => m._id.toString() === exp.payer)?.name || "Unknown";
      return { ...exp.toObject(), payerName };
    });

    res.json({ group, expenses: enrichedExpenses, balances, settlements: calculateSettlements(balances) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. MINTSENSE AI PARSER (Requirement 8)
router.post("/:id/mintsense", protect, async (req, res) => {
  try {
    const { text } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    // Run AI Engine
    const parsedData = mintSenseParser(text, group.members);
    res.json(parsedData);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. ADD EXPENSE (With Category)
router.post("/:id/expenses", protect, async (req, res) => {
  try {
    const { description, amount, splitType, splits, payer, category } = req.body;
    const group = await Group.findById(req.params.id);
    const payerId = payer || group.members[0]._id.toString();
    const total = parseFloat(amount);
    
    let finalSplits = [];
    if (splitType === 'EQUAL') {
      let share = Math.floor((total / group.members.length) * 100) / 100;
      let remainder = total - (share * group.members.length);
      finalSplits = group.members.map((m, i) => ({ user: m._id.toString(), amount: i === 0 ? share + remainder : share }));
    } else if (splitType === 'EXACT') {
      finalSplits = splits.map(s => ({ user: s.user, amount: Number(s.value) }));
    } else if (splitType === 'PERCENT') {
      finalSplits = splits.map(s => ({ user: s.user, amount: (total * Number(s.value)) / 100 }));
    }

    const expense = await Expense.create({ 
      description, amount: total, payer: payerId, group: group._id, splitType, splits: finalSplits,
      category: category || "General" // Save Category
    });
    res.status(201).json(expense);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 4. EDIT EXPENSE
router.put("/expenses/:id", protect, async (req, res) => {
  try {
    const { description, amount, category } = req.body;
    const expense = await Expense.findByIdAndUpdate(req.params.id, { description, amount, category }, { new: true });
    res.json(expense);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// STANDARD CRUD ROUTES
router.post("/", protect, async (req, res) => {
  const group = await Group.create({
    name: req.body.name, createdBy: req.user._id,
    members: [{ name: "You", isAdmin: true, avatarColor: "bg-blue-500" }]
  });
  res.status(201).json(group);
});

router.put("/:id", protect, async (req, res) => {
  const group = await Group.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
  res.json(group);
});

router.post("/:id/members", protect, async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (group.members.length >= 4) return res.status(400).json({ error: "Group full" });
  // Random Color
  const colors = ["bg-red-500", "bg-green-500", "bg-purple-500", "bg-yellow-500", "bg-pink-500", "bg-indigo-500"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  group.members.push({ name: req.body.name, avatarColor: color });
  await group.save();
  res.json(group);
});

router.delete("/:id/members/:memberId", protect, async (req, res) => {
  const group = await Group.findById(req.params.id);
  const hasExpenses = await Expense.findOne({ group: group._id, $or: [{ payer: req.params.memberId }, { "splits.user": req.params.memberId }] });
  if (hasExpenses) return res.status(400).json({ error: "Member has expenses" });
  group.members.pull({ _id: req.params.memberId });
  await group.save();
  res.json(group);
});

router.delete("/expenses/:id", protect, async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.delete("/:id", protect, async (req, res) => {
  await Expense.deleteMany({ group: req.params.id });
  await Group.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.get("/", protect, async (req, res) => {
  const groups = await Group.find({ createdBy: req.user._id });
  res.json(groups);
});

module.exports = router;

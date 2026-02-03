const express = require("express");
const router = express.Router();
const { Group, Expense } = require("../models/Schemas");
const { protect } = require("../middleware/authMiddleware");

// --- 🧠 IMPROVED MINTSENSE AI ENGINE ---

const STOP_WORDS = [
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves",
  "he", "him", "his", "himself", "she", "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
  "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be","rs", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
  "while", "of", "at", "by", "for", "with", "about", "against", "between", "into", "through", "during", "before", "after", "above", "below",
  "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here", "there",
  "when", "where", "why", "how", "all", "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now", "paid", "spent", "cost"
];

const mintSenseParser = (text, members) => {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  // 1. Extract Amount (Find first number)
  const amountMatch = text.match(/(\d+(\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[0]) : 0;

  // 2. Extract Payer (Match against Member Names)
  let payer = members[0]._id.toString(); 
  let payerName = members[0].name;
  
  // Sort names longest to shortest to catch "Alice Smith" before "Alice"
  const sortedMembers = [...members].sort((a, b) => b.name.length - a.name.length);
  
  for (const m of sortedMembers) {
    if (lowerText.includes(m.name.toLowerCase())) {
      payer = m._id.toString();
      payerName = m.name;
      break;
    }
  }

  // 3. Auto-Categorize (Expanded Dictionary)
  const keywords = {
    "Food": ["pizza", "burger", "lunch", "dinner", "breakfast", "coffee", "tea", "snacks", "restaurant", "swiggy", "zomato", "kfc", "mcdonalds", "drink", "beer", "bar", "food"],
    "Travel": ["uber", "ola", "cab", "taxi", "bus", "train", "flight", "ticket", "fuel", "petrol", "diesel", "trip", "gas", "metro"],
    "Entertainment": ["movie", "film", "cinema", "netflix", "game", "bowling", "concert", "show", "party", "club", "spotify"],
    "Utilities": ["bill", "rent", "electricity", "wifi", "recharge", "mobile", "water", "internet", "maintenance"],
    "Shopping": ["grocery", "clothes", "shoe", "mall", "market", "amazon", "flipkart", "shop", "store", "buy"]
  };
  
  let category = "General";
  for (const cat in keywords) {
    if (keywords[cat].some(k => lowerText.includes(k))) {
      category = cat;
      break;
    }
  }

  // 4. CLEAN DESCRIPTION (Remove Amount, Name, and Stop Words)
  
  // Remove amount
  let cleanText = text.replace(new RegExp(amount, 'g'), '');
  
  // Remove payer name (case insensitive)
  cleanText = cleanText.replace(new RegExp(payerName, 'gi'), '');

  // Split into words and filter out Stop Words
  let words = cleanText.split(/\s+/);
  
  let filteredWords = words.filter(w => {
    const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove punctuation like "dinner," -> "dinner"
    return !STOP_WORDS.includes(cleanWord) && cleanWord.length > 0;
  });

  let description = filteredWords.join(" ");

  // Final Cleanup
  description = description.charAt(0).toUpperCase() + description.slice(1);
  if (description.length < 2) description = category; // Fallback if everything was removed

  return { description, amount, payer, category };
};

// --- ROUTES ---

// 1. AI ROUTE
router.post("/:id/mintsense", protect, async (req, res) => {
  try {
    const { text } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const result = mintSenseParser(text, group.members);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "AI Failed" });
  }
});

// 2. GET GROUP
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
      exp.splits.forEach(s => { if (balances[s.user] !== undefined) balances[s.user] -= s.amount; });
    });

    let debtors = [], creditors = [];
    Object.keys(balances).forEach(id => {
      if (balances[id] < -0.01) debtors.push({ id, amount: balances[id] });
      if (balances[id] > 0.01) creditors.push({ id, amount: balances[id] });
    });
    debtors.sort((a,b) => a.amount - b.amount);
    creditors.sort((a,b) => b.amount - a.amount);
    
    const settlements = [];
    let i=0, j=0;
    while(i < debtors.length && j < creditors.length) {
      const d = debtors[i], c = creditors[j];
      const amt = Math.min(Math.abs(d.amount), c.amount);
      if(amt > 0) settlements.push({ from: d.id, to: c.id, amount: parseFloat(amt.toFixed(2)) });
      d.amount += amt; c.amount -= amt;
      if(Math.abs(d.amount) < 0.01) i++;
      if(c.amount < 0.01) j++;
    }

    const enrichedExpenses = expenses.map(exp => {
      const payerName = group.members.find(m => m._id.toString() === exp.payer)?.name || "Unknown";
      return { ...exp.toObject(), payerName };
    });

    res.json({ group, expenses: enrichedExpenses, balances, settlements });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. ADD EXPENSE
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
      description, amount: total, payer: payerId, group: group._id, splitType, splits: finalSplits, category: category || "General"
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

// CRUD HELPERS
router.post("/", protect, async (req, res) => {
  const group = await Group.create({ name: req.body.name, createdBy: req.user._id, members: [{ name: "You", isAdmin: true, avatarColor: "bg-blue-500" }] });
  res.status(201).json(group);
});
router.put("/:id", protect, async (req, res) => {
  const group = await Group.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
  res.json(group);
});
router.delete("/:id", protect, async (req, res) => {
  await Expense.deleteMany({ group: req.params.id }); await Group.findByIdAndDelete(req.params.id); res.json({ success: true });
});
router.delete("/expenses/:id", protect, async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id); res.json({ success: true });
});

// ADD MEMBER - UPDATED WITH LIMIT
router.post("/:id/members", protect, async (req, res) => {
  const group = await Group.findById(req.params.id);
  
  // CHECK: Limit to 4 members (You + 3 others)
  if (group.members.length >= 4) {
    return res.status(400).json({ error: "Member limit reached. You can only add up to 3 members." });
  }

  const colors = ["bg-red-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500"];
  group.members.push({ name: req.body.name, avatarColor: colors[Math.floor(Math.random()*colors.length)] });
  await group.save(); 
  res.json(group);
});

router.delete("/:id/members/:memberId", protect, async (req, res) => {
  const group = await Group.findById(req.params.id);
  const has = await Expense.findOne({ group: group._id, $or: [{ payer: req.params.memberId }, { "splits.user": req.params.memberId }] });
  if(has) return res.status(400).json({ error: "Has expenses" });
  group.members.pull({ _id: req.params.memberId }); await group.save(); res.json(group);
});
router.put("/:id/members/:memberId", protect, async (req, res) => {
  const group = await Group.findById(req.params.id);
  const m = group.members.id(req.params.memberId); m.name = req.body.name; await group.save(); res.json(group);
});
router.get("/", protect, async (req, res) => {
  const groups = await Group.find({ createdBy: req.user._id }); res.json(groups);
});

module.exports = router;

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { User, Group, Expense } = require('./models/Schemas');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [ "http://localhost:3000", process.env.CLIENT_URL ], // We will set CLIENT_URL in Render later
  credentials: true
}));
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.error("DB Error:", err));

// --- Middleware ---
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Access Denied" });
  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) { res.status(400).json({ error: "Invalid Token" }); }
};

// --- 1. Auth APIs (Added /api prefix) ---
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.cookie('token', token, { httpOnly: true }).json({ user });
  } catch (e) { res.status(400).json({ error: "Email exists" }); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) 
    return res.status(400).json({ error: "Invalid credentials" });
  
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
  res.cookie('token', token, { httpOnly: true }).json({ success: true, user });
});

app.post('/api/logout', (req, res) => {
    res.cookie('token', '', { expires: new Date(0) }).json({ success: true });
});

app.get('/api/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch(e) { res.json(null); }
});

// --- 2. Group APIs ---
app.post('/api/groups', verifyToken, async (req, res) => {
  const members = await User.find({ email: { $in: req.body.emails || [] } });
  const memberIds = members.map(m => m._id);
  if(!memberIds.includes(req.user._id)) memberIds.push(req.user._id);

  const group = await Group.create({
    name: req.body.name,
    members: memberIds,
    createdBy: req.user._id
  });
  res.json(group);
});

app.get('/api/groups', verifyToken, async (req, res) => {
  const groups = await Group.find({ members: req.user._id }).populate('members', 'name email');
  res.json(groups);
});

app.get('/api/groups/:id', verifyToken, async (req, res) => {
    const group = await Group.findById(req.params.id).populate('members', 'name email');
    res.json(group);
});

// --- 3. Expense & Balance APIs ---
app.post('/api/expenses', verifyToken, async (req, res) => {
  const { description, amount, groupId, splitType, splits } = req.body;
  const expense = await Expense.create({
    description, amount, splitType, splits,
    payer: req.user._id,
    group: groupId
  });
  res.json(expense);
});

app.get('/api/groups/:id/balance', verifyToken, async (req, res) => {
  const expenses = await Expense.find({ group: req.params.id }).populate('payer splits.user');
  let balances = {}; 
  
  expenses.forEach(exp => {
    balances[exp.payer._id] = (balances[exp.payer._id] || 0) + exp.amount;
    exp.splits.forEach(split => {
      balances[split.user._id] = (balances[split.user._id] || 0) - split.amount;
    });
  });
  res.json({ balances, expenses });
});

// --- 4. AI API ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.post('/api/ai/parse', verifyToken, async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });
  const prompt = `Extract JSON { "description": string, "amount": number } from: "${req.body.text}"`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json/g, '').replace(/```/g, '');
    res.json(JSON.parse(text));
  } catch (e) { res.status(500).json({ error: "AI Error" }); }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

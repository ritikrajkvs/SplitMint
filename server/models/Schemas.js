const mongoose = require('mongoose');

// 1. User
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// 2. Group
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatarColor: { type: String, default: "bg-gray-400" },
  isAdmin: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [memberSchema], 
  createdAt: { type: Date, default: Date.now }
});

// 3. Expense (Added Category)
const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, default: "General" }, // NEW: Auto-Categorization
  date: { type: Date, default: Date.now },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  payer: { type: String, required: true }, 
  splitType: { type: String, enum: ['EQUAL', 'EXACT', 'PERCENT'], default: 'EQUAL' },
  splits: [{
    user: { type: String, required: true },
    amount: { type: Number },
    percent: { type: Number } 
  }]
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Group: mongoose.model('Group', groupSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};

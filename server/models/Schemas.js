const mongoose = require('mongoose');

// 1. User (Only for YOU, the Admin)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// 2. Group (With Embedded Members)
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatarColor: { type: String, default: "bg-gray-400" },
  isAdmin: { type: Boolean, default: false }, // To mark YOU
  joinedAt: { type: Date, default: Date.now }
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [memberSchema], // Stores people like [{name: "Bob", ...}, {name: "Alice", ...}]
  createdAt: { type: Date, default: Date.now }
});

// 3. Expense
const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  
  // Payer is the _id of the member inside the group
  payer: { type: String, required: true }, 
  
  splitType: { 
    type: String, 
    enum: ['EQUAL', 'EXACT', 'PERCENT'], 
    default: 'EQUAL' 
  },
  
  splits: [{
    user: { type: String, required: true }, // Member _id
    amount: { type: Number },
    percent: { type: Number } 
  }]
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Group: mongoose.model('Group', groupSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};

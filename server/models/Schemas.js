const mongoose = require('mongoose');

// 1. User (Only for YOU, the Admin)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// 2. Group (Contains Embedded Members)
const memberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatarColor: { type: String, default: "bg-gray-400" },
  isAdmin: { type: Boolean, default: false } // To identify YOU
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [memberSchema], // Embedded list of people
  createdAt: { type: Date, default: Date.now }
});

// 3. Expense (Links to Group Members, NOT Users)
const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  
  // Payer is just a Member ID string from the Group array
  payer: { type: String, required: true }, 
  
  splitType: { 
    type: String, 
    enum: ['EQUAL', 'EXACT', 'PERCENT'], 
    default: 'EQUAL' 
  },
  
  splits: [{
    user: { type: String, required: true }, // Member ID
    amount: { type: Number },
    percent: { type: Number } 
  }]
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Group: mongoose.model('Group', groupSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
  createdAt: { type: Date, default: Date.now }
});

const expenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  
  // NEW: Support for different split types
  splitType: { 
    type: String, 
    enum: ['EQUAL', 'EXACT', 'PERCENT'], 
    default: 'EQUAL' 
  },
  
  splits: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number }, // How much this person OWES
    percent: { type: Number } // Optional: Store % if needed
  }]
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Group: mongoose.model('Group', groupSchema),
  Expense: mongoose.model('Expense', expenseSchema)
};

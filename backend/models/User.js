const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  EMAIL_REGEX,
  assertStrongPassword,
  normalizeEmail
} = require('../utils/security');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: [EMAIL_REGEX, 'Please provide a valid email address']
  },
  password: { type: String, required: true, minlength: 10, maxlength: 255 },
  role: {
    type: String,
    enum: ['Admin', 'Cashier', 'Doctor', 'Lab Technician'],
    required: true
  },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  mustChangePassword: { type: Boolean, default: false },
  lastLogin: { type: Date }
}, { timestamps: true });

userSchema.pre('validate', function(next) {
  if (this.email) {
    this.email = normalizeEmail(this.email);
  }

  if (typeof this.name === 'string') {
    this.name = this.name.trim();
  }

  next();
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  assertStrongPassword(this.password);
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (typeof candidatePassword !== 'string' || !candidatePassword) {
    return false;
  }

  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

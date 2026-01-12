const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    invoiceNumber: { type: String, required: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    remainingBalance: { type: Number, required: true },
    status: { type: String, enum: ['UNPAID', 'PARTIAL', 'PAID'], default: 'UNPAID' }
}, { timestamps: true });

module.exports = mongoose.model('Debt', debtSchema);

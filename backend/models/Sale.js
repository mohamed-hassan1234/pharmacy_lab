const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true, unique: true }, // Format: INV-XXXX
    date: { type: Date, default: Date.now },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Optional link to registered customer
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }, // Optional link to doctor prescription
    labRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'LabRequest' }, // Optional link to doctor note/consultation
    customerName: { type: String, required: true },
    items: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        name: { type: String },
        sellType: { type: String, enum: ['BOX', 'UNIT'], required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true }, // SOS
        total: { type: Number, required: true }      // SOS
    }],
    totalAmount: { type: Number, required: true }, // SOS
    totalCost: { type: Number, required: true },   // SOS (Based on purchase price)
    profit: { type: Number, required: true },      // SOS
    paymentType: { type: String, enum: ['CASH', 'CREDIT'], required: true },
    status: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL'], default: 'PAID' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);

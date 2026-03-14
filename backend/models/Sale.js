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
        totalUnitsSold: { type: Number, default: 0 },
        unitPrice: { type: Number, required: true }, // SOS
        total: { type: Number, required: true },     // SOS
        lineCost: { type: Number, default: 0 },      // SOS
        unitsPerBoxSnapshot: { type: Number, default: 0 },
        purchasePricePerUnitSnapshot: { type: Number, default: 0 },
        purchasePricePerBoxSnapshot: { type: Number, default: 0 },
        sellingPricePerUnitSnapshot: { type: Number, default: 0 },
        sellingPricePerBoxSnapshot: { type: Number, default: 0 }
    }],
    totalAmount: { type: Number, required: true }, // SOS
    totalCost: { type: Number, required: true },   // SOS (Based on purchase price)
    profit: { type: Number, required: true },      // SOS
    paymentType: { type: String, enum: ['CASH', 'CREDIT'], required: true },
    status: { type: String, enum: ['PAID', 'UNPAID', 'PARTIAL'], default: 'PAID' }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);

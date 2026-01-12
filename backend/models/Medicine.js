const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    purchasePricePerBox: { type: Number, required: true }, // In SOS
    unitsPerBox: { type: Number, required: true },
    sellingPricePerUnit: { type: Number, required: true }, // In SOS (Price per single pill)
    sellingPricePerBox: { type: Number },  // In SOS (Price per full box) - Optional for backward compatibility
    boxesInStock: { type: Number, default: 0 },
    totalUnitsInStock: { type: Number, default: 0 }, // boxes * unitsPerBox
    expiryDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Supplier = require('../models/Supplier');
const Medicine = require('../models/Medicine');

// @desc    Register a new supplier
// @route   POST /api/inventory/suppliers
router.post('/suppliers', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { name, source, note } = req.body;
        const supplier = await Supplier.create({ name, source, note, addedBy: req.user._id });
        res.status(201).json(supplier);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get all suppliers
router.get('/suppliers', protect, async (req, res) => {
    try {
        const suppliers = await Supplier.find();
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register a new medicine (Buy by Box)
// @route   POST /api/inventory/medicines
router.post('/medicines', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { name, category, supplierId, purchasePricePerBox, unitsPerBox, sellingPricePerUnit, sellingPricePerBox, boxesBought, expiryDate } = req.body;

        const medicine = await Medicine.create({
            name,
            category,
            supplier: supplierId,
            purchasePricePerBox,
            unitsPerBox,
            sellingPricePerUnit,
            sellingPricePerBox: sellingPricePerBox || (sellingPricePerUnit * unitsPerBox),
            boxesInStock: boxesBought,
            totalUnitsInStock: boxesBought * unitsPerBox,
            expiryDate
        });

        res.status(201).json(medicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get all medicines
router.get('/medicines', protect, async (req, res) => {
    try {
        const medicines = await Medicine.find().populate('supplier', 'name source');
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update a medicine
router.patch('/medicines/:id', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const {
            name,
            category,
            supplierId,
            purchasePricePerBox,
            unitsPerBox,
            sellingPricePerUnit,
            sellingPricePerBox,
            boxesBought,
            expiryDate
        } = req.body;

        const nextUnitsPerBox = Number(unitsPerBox || medicine.unitsPerBox);
        if (!Number.isFinite(nextUnitsPerBox) || nextUnitsPerBox <= 0) {
            return res.status(400).json({ message: 'Units per box must be greater than 0' });
        }

        if (name !== undefined) medicine.name = name;
        if (category !== undefined) medicine.category = category;
        if (supplierId !== undefined) medicine.supplier = supplierId;
        if (purchasePricePerBox !== undefined) medicine.purchasePricePerBox = purchasePricePerBox;
        if (sellingPricePerUnit !== undefined) medicine.sellingPricePerUnit = sellingPricePerUnit;
        if (expiryDate !== undefined) medicine.expiryDate = expiryDate;
        medicine.unitsPerBox = nextUnitsPerBox;
        medicine.sellingPricePerBox = sellingPricePerBox || (Number(medicine.sellingPricePerUnit) * nextUnitsPerBox);

        if (boxesBought !== undefined && boxesBought !== '') {
            const nextBoxesInStock = Number(boxesBought);
            if (!Number.isFinite(nextBoxesInStock) || nextBoxesInStock < 0) {
                return res.status(400).json({ message: 'Boxes in stock cannot be negative' });
            }
            medicine.boxesInStock = nextBoxesInStock;
            medicine.totalUnitsInStock = nextBoxesInStock * nextUnitsPerBox;
        } else {
            medicine.boxesInStock = Math.floor((Number(medicine.totalUnitsInStock) || 0) / nextUnitsPerBox);
        }

        await medicine.save();
        await medicine.populate('supplier', 'name source');

        res.json(medicine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete a medicine
router.delete('/medicines/:id', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        await medicine.deleteOne();
        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;

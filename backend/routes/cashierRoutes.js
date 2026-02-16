const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const LabRequest = require('../models/LabRequest');

const Prescription = require('../models/Prescription');

// Process Sale (BOX or UNIT logic)
router.post('/sales', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { items, customerName, customerId, paymentType, paidAmount = 0, prescriptionId, labRequestId } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('No medicines selected for sale');
        }

        let linkedPrescription = null;
        if (prescriptionId) {
            linkedPrescription = await Prescription.findById(prescriptionId).populate('patientId', 'name');
            if (!linkedPrescription) throw new Error('Prescription not found');
            if (linkedPrescription.status !== 'Issued') {
                throw new Error('Prescription already dispensed');
            }
        }

        const resolvedCustomerName =
            (customerName && customerName.trim()) ||
            linkedPrescription?.patientId?.name ||
            'Walk-in Customer';

        let totalAmount = 0;
        let totalCost = 0;
        const saleItems = [];

        for (const item of items) {
            const med = await Medicine.findById(item.medicineId);
            if (!med) throw new Error(`Medicine ${item.name} not found`);

            let totalUnitsSold = 0;
            if (item.sellType === 'BOX') {
                totalUnitsSold = item.quantity * med.unitsPerBox;
            } else {
                totalUnitsSold = item.quantity;
            }

            if (med.totalUnitsInStock < totalUnitsSold) {
                throw new Error(`Insufficient stock for ${med.name}`);
            }

            const boxPrice = med.sellingPricePerBox || (med.sellingPricePerUnit * med.unitsPerBox);
            const lineTotal = item.quantity * (item.sellType === 'BOX' ? boxPrice : med.sellingPricePerUnit);

            // Cost calculation based on purchase price per unit
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            const lineCost = totalUnitsSold * purchasePricePerUnit;

            totalAmount += lineTotal;
            totalCost += lineCost;

            saleItems.push({
                medicineId: med._id,
                name: med.name,
                sellType: item.sellType,
                quantity: item.quantity,
                unitPrice: item.sellType === 'BOX' ? boxPrice : med.sellingPricePerUnit,
                total: lineTotal
            });

            // Update Stock
            med.totalUnitsInStock -= totalUnitsSold;
            med.boxesInStock = Math.floor(med.totalUnitsInStock / med.unitsPerBox);
            await med.save();
        }

        const saleCount = await Sale.countDocuments();
        const invoiceNumber = `INV-${(saleCount + 1).toString().padStart(4, '0')}`;

        const sale = await Sale.create({
            invoiceNumber,
            cashierId: req.user._id,
            customerId,
            prescriptionId: prescriptionId || null,
            labRequestId: labRequestId || null,
            customerName: resolvedCustomerName,
            items: saleItems,
            totalAmount,
            totalCost,
            profit: totalAmount - totalCost,
            paymentType,
            status: paymentType === 'CASH' ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
        });

        // Handle Credit (Debt)
        if (paymentType === 'CREDIT') {
            await Debt.create({
                customerName: resolvedCustomerName,
                invoiceNumber,
                saleId: sale._id,
                totalAmount,
                paidAmount,
                remainingBalance: totalAmount - paidAmount,
                status: paidAmount === 0 ? 'UNPAID' : 'PARTIAL'
            });
        }

        // Update Prescription Status if applicable
        if (prescriptionId) {
            await Prescription.findByIdAndUpdate(prescriptionId, { status: 'Dispensed' });
        }

        if (labRequestId) {
            await LabRequest.findByIdAndUpdate(labRequestId, {
                dispensedSaleId: sale._id,
                dispensedAt: new Date(),
                dispensedBy: req.user._id
            });
        }

        res.status(201).json(sale);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get Debts
router.get('/debts', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const debts = await Debt.find().sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register a new customer
// @route   POST /api/cashier/customers
router.post('/customers', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const customer = await Customer.create({ name, phone, addedBy: req.user._id });
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get all customers
router.get('/customers', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Cashier Dashboard Stats
router.get('/dashboard', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        // Total Customers
        const totalCustomers = await Customer.countDocuments();

        // Total Suppliers
        const totalSuppliers = await Supplier.countDocuments();

        // All Medicines
        const allMedicines = await Medicine.find();

        // Out of Stock (less than 5 units)
        const outOfStock = allMedicines.filter(m => m.totalUnitsInStock < 5).length;

        // Expired Medicines
        const today = new Date();
        const expiredMedicines = allMedicines.filter(m => new Date(m.expiryDate) < today).length;

        // Near Expiry (within 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const nearExpiry = allMedicines.filter(m => {
            const expiry = new Date(m.expiryDate);
            return expiry > today && expiry <= thirtyDaysFromNow;
        }).length;

        // Sales Data
        const allSales = await Sale.find({ cashierId: req.user._id });
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = allSales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = allSales.reduce((acc, s) => acc + s.totalCost, 0);

        // Debts
        const debts = await Debt.find({ status: { $ne: 'PAID' } });
        const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);

        // Monthly Data for Charts (Last 12 months)
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthSales = await Sale.find({
                cashierId: req.user._id,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });

            const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
            const monthProfit = monthSales.reduce((acc, s) => acc + s.profit, 0);
            const monthCost = monthSales.reduce((acc, s) => acc + s.totalCost, 0);

            monthlyData.push({
                month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue,
                profit: monthProfit,
                cost: monthCost,
                sales: monthSales.length
            });
        }

        // Top Selling Medicines
        const salesWithItems = await Sale.find({ cashierId: req.user._id });
        const medicineStats = {};

        salesWithItems.forEach(sale => {
            sale.items.forEach(item => {
                if (!medicineStats[item.name]) {
                    medicineStats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                }
                medicineStats[item.name].quantity += item.quantity;
                medicineStats[item.name].revenue += item.total;
            });
        });

        const topMedicines = Object.values(medicineStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        res.json({
            totalCustomers,
            totalSuppliers,
            outOfStock,
            expiredMedicines,
            nearExpiry,
            totalRevenue,
            totalProfit,
            totalCost,
            totalDebts,
            monthlyData,
            topMedicines,
            totalMedicines: allMedicines.length,
            totalSales: allSales.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get Cashier Reports
router.get('/reports', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const sales = await Sale.find({ cashierId: req.user._id });
        const debts = await Debt.find({ status: { $ne: 'PAID' } });

        const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = sales.reduce((acc, s) => acc + s.totalCost, 0);
        const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);
        const cashRevenue = sales.filter(s => s.paymentType === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
        const creditRevenue = sales.filter(s => s.paymentType === 'CREDIT').reduce((acc, s) => acc + s.totalAmount, 0);

        // REAL-TIME INVENTORY AUDIT (TRUSTED DATA)
        const allMeds = await Medicine.find();
        let investedStockValue = 0;
        let totalFullBoxes = 0;
        let totalLoosePills = 0;

        allMeds.forEach(med => {
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            const currentStockValue = med.totalUnitsInStock * purchasePricePerUnit;
            investedStockValue += currentStockValue;
            totalFullBoxes += med.boxesInStock;
            totalLoosePills += (med.totalUnitsInStock % med.unitsPerBox);
        });

        const recentTransactions = await Sale.find({ cashierId: req.user._id })
            .populate({
                path: 'prescriptionId',
                select: 'diagnosis physicalExamination patientId',
                populate: { path: 'patientId', select: 'name patientId' }
            })
            .populate('labRequestId', 'patientName doctorConclusion physicalExamination')
            .sort({ createdAt: -1 })
            .limit(20);

        const patientMedicinePurchases = recentTransactions
            .filter((sale) => sale.prescriptionId || sale.labRequestId)
            .map((sale) => ({
                invoiceNumber: sale.invoiceNumber,
                patientName: sale.prescriptionId?.patientId?.name || sale.labRequestId?.patientName || sale.customerName,
                diagnosis: sale.prescriptionId?.diagnosis || sale.labRequestId?.doctorConclusion || '',
                physicalExamination: sale.prescriptionId?.physicalExamination || sale.labRequestId?.physicalExamination || '',
                paymentType: sale.paymentType,
                totalAmount: sale.totalAmount,
                items: sale.items,
                createdAt: sale.createdAt
            }));

        res.json({
            totalRevenue,
            totalProfit,
            totalCost,
            totalDebts,
            cashRevenue,
            creditRevenue,
            investedStockValue, // Money currently sitting on the shelf
            totalFullBoxes,
            totalLoosePills,
            recentTransactions,
            patientMedicinePurchases
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all pending debts (Dayn)
router.get('/debts', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const debts = await Debt.find({ status: { $ne: 'PAID' } }).sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Pay off a debt (Collect money)
router.patch('/debts/:id', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { amountPaid } = req.body;
        const debt = await Debt.findById(req.params.id);

        if (!debt) return res.status(404).json({ message: 'Debt record not found' });

        debt.paidAmount += parseFloat(amountPaid);
        debt.remainingBalance = debt.totalAmount - debt.paidAmount;

        if (debt.remainingBalance <= 0) {
            debt.status = 'PAID';
            debt.remainingBalance = 0;
        } else if (debt.paidAmount > 0) {
            debt.status = 'PARTIAL';
        }

        await debt.save();
        res.json(debt);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get All Prescriptions for Cashier
router.get('/prescriptions', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ status: 'Issued' })
            .populate('patientId', 'name patientId')
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 });
        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;


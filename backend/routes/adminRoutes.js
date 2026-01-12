const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Debt = require('../models/Debt');

// @desc    Get Admin Dashboard Stats (Monitor Everything)
router.get('/dashboard', protect, authorize('Admin'), async (req, res) => {
    try {
        // Staff Statistics
        const totalCashiers = await User.countDocuments({ role: 'Cashier' });
        const activeCashiers = await User.countDocuments({ role: 'Cashier', status: 'Active' });
        const suspendedCashiers = await User.countDocuments({ role: 'Cashier', status: 'Inactive' });

        // Customer & Supplier Stats
        const totalCustomers = await Customer.countDocuments();
        const totalSuppliers = await Supplier.countDocuments();

        // Inventory Stats
        const allMedicines = await Medicine.find();
        const totalMedicines = allMedicines.length;
        const outOfStock = allMedicines.filter(m => m.totalUnitsInStock < 5).length;
        const today = new Date();
        const expiredMedicines = allMedicines.filter(m => new Date(m.expiryDate) < today).length;

        // Calculate total stock value
        let totalStockValue = 0;
        allMedicines.forEach(med => {
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            totalStockValue += med.totalUnitsInStock * purchasePricePerUnit;
        });

        // Financial Stats (All Sales)
        const allSales = await Sale.find();
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = allSales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = allSales.reduce((acc, s) => acc + s.totalCost, 0);

        // Debts
        const debts = await Debt.find({ status: { $ne: 'PAID' } });
        const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);

        // Monthly Sales Data (Last 12 months)
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthSales = await Sale.find({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });

            const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
            const monthProfit = monthSales.reduce((acc, s) => acc + s.profit, 0);

            monthlyData.push({
                month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue,
                profit: monthProfit,
                sales: monthSales.length
            });
        }

        // Recent Activities (Last 10 sales)
        const recentSales = await Sale.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('cashierId', 'name email');

        res.json({
            staff: {
                totalCashiers,
                activeCashiers,
                suspendedCashiers
            },
            inventory: {
                totalMedicines,
                outOfStock,
                expiredMedicines,
                totalStockValue
            },
            customers: {
                total: totalCustomers
            },
            suppliers: {
                total: totalSuppliers
            },
            financial: {
                totalRevenue,
                totalProfit,
                totalCost,
                totalDebts
            },
            monthlyData,
            recentSales
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Staff (Cashiers, Doctors, Lab Techs)
router.get('/staff', protect, authorize('Admin'), async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: 'Admin' } })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create New Staff Member
router.post('/staff', protect, authorize('Admin'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            status: 'Active'
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update Staff Member
router.patch('/staff/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const { name, email, status } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (status) user.status = status;

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Reset Staff Password
router.patch('/staff/:id/reset-password', protect, authorize('Admin'), async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Suspend/Activate Staff
router.patch('/staff/:id/toggle-status', protect, authorize('Admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.status = user.status === 'Active' ? 'Inactive' : 'Active';
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete Staff Member
router.delete('/staff/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        await user.deleteOne();
        res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get All Inventory (Monitor Stock)
router.get('/inventory', protect, authorize('Admin'), async (req, res) => {
    try {
        const medicines = await Medicine.find()
            .populate('supplier', 'name source')
            .sort({ createdAt: -1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Customers
router.get('/customers', protect, authorize('Admin'), async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Sales (Monitor All Transactions)
router.get('/sales', protect, authorize('Admin'), async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('cashierId', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Debts
router.get('/debts', protect, authorize('Admin'), async (req, res) => {
    try {
        const debts = await Debt.find().sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

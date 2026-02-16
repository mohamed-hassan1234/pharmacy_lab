const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Debt = require('../models/Debt');
const Patient = require('../models/Patient');
const LabRequest = require('../models/LabRequest');
const Prescription = require('../models/Prescription');

const STAFF_ROLES = ['Cashier', 'Doctor', 'Lab Technician'];
const DEFAULT_PASSWORD = '1234';

// @desc    Get Admin Dashboard Stats (Monitor Everything)
router.get('/dashboard', protect, authorize('Admin'), async (req, res) => {
    try {
        // Staff Statistics (all non-admin roles)
        const allStaff = await User.find({ role: { $in: STAFF_ROLES } }).select('role status');
        const byRole = {
            cashier: { total: 0, active: 0, suspended: 0 },
            doctor: { total: 0, active: 0, suspended: 0 },
            labTechnician: { total: 0, active: 0, suspended: 0 }
        };

        allStaff.forEach((member) => {
            const isActive = member.status === 'Active';
            if (member.role === 'Cashier') {
                byRole.cashier.total += 1;
                byRole.cashier.active += isActive ? 1 : 0;
                byRole.cashier.suspended += isActive ? 0 : 1;
            } else if (member.role === 'Doctor') {
                byRole.doctor.total += 1;
                byRole.doctor.active += isActive ? 1 : 0;
                byRole.doctor.suspended += isActive ? 0 : 1;
            } else if (member.role === 'Lab Technician') {
                byRole.labTechnician.total += 1;
                byRole.labTechnician.active += isActive ? 1 : 0;
                byRole.labTechnician.suspended += isActive ? 0 : 1;
            }
        });

        const totalStaff = allStaff.length;
        const activeStaff = allStaff.filter((member) => member.status === 'Active').length;
        const suspendedStaff = totalStaff - activeStaff;

        // Customer & Supplier Stats
        const totalCustomers = await Customer.countDocuments();
        const totalSuppliers = await Supplier.countDocuments();
        const totalPatients = await Patient.countDocuments();

        // Inventory Stats
        const allMedicines = await Medicine.find();
        const totalMedicines = allMedicines.length;
        const outOfStock = allMedicines.filter(m => m.totalUnitsInStock < 5).length;
        const inventoryNow = new Date();
        const expiredMedicines = allMedicines.filter(m => new Date(m.expiryDate) < inventoryNow).length;

        // Calculate total stock value
        let totalStockValue = 0;
        allMedicines.forEach(med => {
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            totalStockValue += med.totalUnitsInStock * purchasePricePerUnit;
        });
        const totalFullBoxes = allMedicines.reduce((acc, med) => acc + (med.boxesInStock || 0), 0);
        const totalLoosePills = allMedicines.reduce((acc, med) => acc + ((med.totalUnitsInStock || 0) % (med.unitsPerBox || 1)), 0);

        // Financial Stats (All Sales)
        const allSales = await Sale.find();
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = allSales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = allSales.reduce((acc, s) => acc + s.totalCost, 0);
        const cashSalesCount = allSales.filter((sale) => sale.paymentType === 'CASH').length;
        const creditSalesCount = allSales.filter((sale) => sale.paymentType === 'CREDIT').length;

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

        // System process stats
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const labRequests = await LabRequest.find().sort({ createdAt: -1 });
        const totalLabRequests = labRequests.length;
        const totalLabPaid = labRequests.filter((req) => req.isPaid).length;
        const totalLabAwaitingDoctor = labRequests.filter((req) => req.status === 'Awaiting Doctor').length;
        const totalLabCompleted = labRequests.filter((req) => req.status === 'Completed').length;

        const prescriptions = await Prescription.find().sort({ createdAt: -1 });
        const totalPrescriptions = prescriptions.length;
        const issuedPrescriptions = prescriptions.filter((p) => p.status === 'Issued').length;
        const dispensedPrescriptions = prescriptions.filter((p) => p.status === 'Dispensed').length;
        const todayPrescriptions = prescriptions.filter((p) => p.createdAt >= startOfToday).length;

        const patientsToday = await Patient.countDocuments({ createdAt: { $gte: startOfToday } });
        const waitingForDoctor = await Patient.countDocuments({ visitStatus: 'Waiting for Doctor' });
        const inConsultation = await Patient.countDocuments({ visitStatus: 'In Consultation' });
        const outpatients = await Patient.countDocuments({ visitStatus: 'Outpatient' });

        // Recent Activities
        const recentSales = await Sale.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('cashierId', 'name email');

        const recentLabRequests = await LabRequest.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('doctorId', 'name')
            .populate('resultEnteredBy', 'name')
            .populate('dispensedBy', 'name');

        const recentPrescriptions = await Prescription.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('doctorId', 'name')
            .populate('patientId', 'name patientId');

        const recentPatients = await Patient.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name patientId visitStatus createdAt');

        const recentDebts = await Debt.find()
            .sort({ updatedAt: -1 })
            .limit(10);

        const activityFeed = [
            ...recentSales.map((sale) => ({
                type: 'SALE',
                title: `Sale ${sale.invoiceNumber}`,
                description: `${sale.customerName} • ${sale.totalAmount} SOS • ${sale.paymentType}`,
                actor: sale.cashierId?.name || 'Unknown',
                createdAt: sale.createdAt
            })),
            ...recentLabRequests.map((request) => ({
                type: 'LAB',
                title: `Lab ${request.ticketNumber}`,
                description: `${request.patientName} • ${request.status}`,
                actor: request.resultEnteredBy?.name || request.doctorName || request.doctorId?.name || 'Unknown',
                createdAt: request.updatedAt || request.createdAt
            })),
            ...recentPrescriptions.map((prescription) => ({
                type: 'PRESCRIPTION',
                title: `Prescription ${prescription.status}`,
                description: `${prescription.patientId?.name || 'Unknown patient'} • ${prescription.medicines?.length || 0} medicines`,
                actor: prescription.doctorId?.name || 'Unknown',
                createdAt: prescription.createdAt
            })),
            ...recentPatients.map((patient) => ({
                type: 'PATIENT',
                title: `Patient ${patient.patientId}`,
                description: `${patient.name} • ${patient.visitStatus}`,
                actor: 'Registration',
                createdAt: patient.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 25);

        res.json({
            staff: {
                total: totalStaff,
                active: activeStaff,
                suspended: suspendedStaff,
                // Backward compatibility for existing frontend keys
                totalCashiers: byRole.cashier.total,
                activeCashiers: byRole.cashier.active,
                suspendedCashiers: byRole.cashier.suspended,
                byRole
            },
            inventory: {
                totalMedicines,
                outOfStock,
                expiredMedicines,
                totalStockValue,
                totalFullBoxes,
                totalLoosePills
            },
            customers: {
                total: totalCustomers
            },
            suppliers: {
                total: totalSuppliers
            },
            patients: {
                total: totalPatients,
                today: patientsToday,
                waitingForDoctor,
                inConsultation,
                outpatient: outpatients
            },
            lab: {
                totalRequests: totalLabRequests,
                paid: totalLabPaid,
                awaitingDoctor: totalLabAwaitingDoctor,
                completed: totalLabCompleted
            },
            prescriptions: {
                total: totalPrescriptions,
                issued: issuedPrescriptions,
                dispensed: dispensedPrescriptions,
                today: todayPrescriptions
            },
            financial: {
                totalRevenue,
                totalProfit,
                totalCost,
                totalDebts,
                totalSales: allSales.length,
                cashSalesCount,
                creditSalesCount
            },
            monthlyData,
            recentSales,
            recentLabRequests,
            recentPrescriptions,
            recentPatients,
            recentDebts,
            activityFeed
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
        if (!STAFF_ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid staff role' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const user = await User.create({
            name,
            email,
            password: password || DEFAULT_PASSWORD,
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
        const { newPassword } = req.body || {};
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot reset admin password from this action' });
        }

        user.password = newPassword || DEFAULT_PASSWORD;
        await user.save();

        res.json({ message: `Password reset successfully (${newPassword ? 'custom' : 'default 1234'})` });
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

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot suspend or activate admin users' });
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

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const LabRequest = require('../models/LabRequest');
const Patient = require('../models/Patient');


// @desc    Create Lab Request (Doctor Only)
router.post('/requests', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const { patient, patientId, patientName, age, sex, requestedTests, requestedTestInput } = req.body;



        // Generate ticket number
        const count = await LabRequest.countDocuments();
        const ticketNumber = `LAB-${(count + 1).toString().padStart(5, '0')}`;

        const labRequest = await LabRequest.create({
            ticketNumber,
            patient,
            patientId,
            patientName,
            age,
            sex,
            doctorId: req.user._id,
            doctorName: req.user.name,
            requestedTests,
            requestedTestInput,
            status: 'Awaiting Payment'
        });


        res.status(201).json(labRequest);
    } catch (error) {
        console.error('Lab Request Error:', error);
        res.status(400).json({ message: error.message });
    }
});


// @desc    Confirm Lab Payment (Cashier Only)
router.patch('/requests/:id/pay', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { amount } = req.body;
        const request = await LabRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ message: 'Request not found' });

        request.isPaid = true;
        request.amount = amount;
        request.status = 'Paid';
        await request.save();

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get All Lab Requests
router.get('/requests', protect, authorize('Lab Technician', 'Doctor', 'Cashier', 'Admin'), async (req, res) => {

    try {
        const { status, isPaid } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (isPaid) filter.isPaid = isPaid === 'true';
        if (req.user.role === 'Doctor') filter.doctorId = req.user._id;

        const requests = await LabRequest.find(filter)
            .populate('doctorId', 'name')
            .populate('patient', 'name patientId')
            .populate('prescriptionId', 'status')
            .populate('dispensedBy', 'name')
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Single Lab Request
router.get('/requests/:id', protect, authorize('Lab Technician', 'Doctor', 'Cashier', 'Admin'), async (req, res) => {
    try {
        const request = await LabRequest.findById(req.params.id)
            .populate('doctorId', 'name')
            .populate('patient', 'name patientId')
            .populate('resultEnteredBy', 'name')
            .populate('printedBy', 'name')
            .populate('prescriptionId', 'status')
            .populate('dispensedBy', 'name');


        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        if (
            req.user.role === 'Doctor' &&
            request.doctorId &&
            request.doctorId._id.toString() !== req.user._id.toString()
        ) {
            return res.status(403).json({ message: 'Not authorized to view this lab request' });
        }

        res.json(request);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Search Lab Request by Ticket Number or Patient Name
router.get('/search', protect, authorize('Lab Technician', 'Doctor', 'Cashier', 'Admin'), async (req, res) => {
    try {
        const { query } = req.query;

        const requests = await LabRequest.find({
            $or: [
                { ticketNumber: { $regex: query, $options: 'i' } },
                { patientName: { $regex: query, $options: 'i' } },
                { patientId: { $regex: query, $options: 'i' } }
            ]
        })
            .populate('doctorId', 'name')
            .populate('patient', 'name patientId')
            .sort({ createdAt: -1 })
            .limit(20);


        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Enter/Update Lab Results (Lab Technician, Cashier, Admin)
router.patch('/requests/:id/results', protect, authorize('Lab Technician', 'Cashier', 'Admin'), async (req, res) => {
    try {
        const { results, resultText } = req.body;
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        if (results) {
            request.results = results;
        }
        request.resultText = typeof resultText === 'string' ? resultText : '';
        request.status = 'Awaiting Doctor'; // Changed to Awaiting Doctor
        request.resultEnteredBy = req.user._id;
        request.resultEnteredAt = new Date();

        await request.save();

        // Update patient status to Waiting for Doctor
        if (request.patient) {
            await Patient.findByIdAndUpdate(request.patient, { visitStatus: 'Waiting for Doctor' });
        }

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Mark as Completed (Updated to allow Cashier/Lab to send to Doctor)
router.patch('/requests/:id/complete', protect, authorize('Lab Technician', 'Cashier', 'Admin'), async (req, res) => {
    try {
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        request.status = 'Awaiting Doctor'; // Changed to Awaiting Doctor
        await request.save();

        if (request.patient) {
            await Patient.findByIdAndUpdate(request.patient, { visitStatus: 'Waiting for Doctor' });
        }


        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Add Doctor Conclusion
router.patch('/requests/:id/conclusion', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const { conclusion } = req.body;
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        request.doctorConclusion = conclusion;
        request.doctorConclusionAt = new Date();
        request.status = 'Reviewed'; // Or 'Completed' according to user flow

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Finalize Request (Sent to Cashier)
router.patch('/requests/:id/send-to-cashier', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const { conclusion, physicalExamination, medicines } = req.body;
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }
        if (!conclusion || !String(conclusion).trim()) {
            return res.status(400).json({ message: 'Doctor note is required before sending to cashier' });
        }

        request.doctorConclusion = String(conclusion).trim();
        request.physicalExamination = physicalExamination;
        request.medicines = Array.isArray(medicines) ? medicines : [];
        request.cashierResponse = '';
        request.cashierRespondedAt = undefined;
        request.cashierRespondedBy = undefined;
        request.sentToCashierAt = new Date();
        request.doctorConclusionAt = new Date();
        request.status = 'Sent to Cashier';

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Cashier Response Back to Doctor
router.patch('/requests/:id/cashier-response', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { cashierResponse } = req.body;
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }
        if (!cashierResponse || !String(cashierResponse).trim()) {
            return res.status(400).json({ message: 'Cashier response is required' });
        }
        if (!['Sent to Cashier', 'Cashier Responded'].includes(request.status)) {
            return res.status(400).json({ message: 'This request is not waiting for cashier feedback' });
        }

        request.cashierResponse = String(cashierResponse).trim();
        request.cashierRespondedAt = new Date();
        request.cashierRespondedBy = req.user._id;
        request.status = 'Cashier Responded';

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Finalize Request After Cashier Response
router.patch('/requests/:id/finalize', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const { conclusion, physicalExamination, medicines, prescriptionId } = req.body;
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        // Save doctor's diagnosis and prescription
        request.doctorConclusion = conclusion;
        request.physicalExamination = physicalExamination;
        request.medicines = medicines;
        if (prescriptionId) request.prescriptionId = prescriptionId;
        request.doctorConclusionAt = new Date();
        request.finalDecisionAt = new Date();
        request.status = 'Completed';

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Mark as Printed (Doctor, Cashier, Lab can print)
router.patch('/requests/:id/print', protect, authorize('Lab Technician', 'Doctor', 'Cashier', 'Admin'), async (req, res) => {
    try {
        const request = await LabRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ message: 'Lab request not found' });
        }

        if (request.status !== 'Completed') {
            return res.status(400).json({ message: 'Cannot print incomplete results' });
        }

        request.isPrinted = true;
        request.printedAt = new Date();
        request.printedBy = req.user._id;

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get Lab Dashboard Stats
router.get('/dashboard', protect, authorize('Lab Technician', 'Cashier', 'Admin'), async (req, res) => {

    try {
        const totalRequests = await LabRequest.countDocuments();
        const pendingRequests = await LabRequest.countDocuments({ status: 'Pending' });
        const inProgressRequests = await LabRequest.countDocuments({ status: 'In Progress' });
        const completedRequests = await LabRequest.countDocuments({ status: 'Completed' });

        // Today's requests
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRequests = await LabRequest.countDocuments({
            createdAt: { $gte: today }
        });

        // This month's requests
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthRequests = await LabRequest.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        // Recent requests
        const recentRequests = await LabRequest.find()
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            totalRequests,
            pendingRequests,
            inProgressRequests,
            completedRequests,
            todayRequests,
            monthRequests,
            recentRequests
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Lab Reports (Daily/Monthly)
router.get('/reports', protect, authorize('Lab Technician', 'Cashier', 'Admin'), async (req, res) => {

    try {
        const { period } = req.query; // 'daily' or 'monthly'

        let startDate;
        const today = new Date();

        if (period === 'daily') {
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        } else {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        }

        const requests = await LabRequest.find({
            createdAt: { $gte: startDate }
        })
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 });

        const summary = {
            total: requests.length,
            pending: requests.filter(r => r.status === 'Pending').length,
            inProgress: requests.filter(r => r.status === 'In Progress').length,
            completed: requests.filter(r => r.status === 'Completed').length,
            requests
        };

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

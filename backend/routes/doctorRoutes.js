const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const Patient = require('../models/Patient');
const LabRequest = require('../models/LabRequest');
const { cleanString, escapeRegex } = require('../utils/security');

// @desc    Register New Patient (Staff/Cashier)
router.post('/patients', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { name, age, sex, phone, address } = req.body;

        // Generate patient ID
        const count = await Patient.countDocuments();
        const patientId = `P-${(count + 1).toString().padStart(5, '0')}`;

        const patient = await Patient.create({
            patientId,
            name,
            age,
            sex,
            phone,
            address,
            registeredBy: req.user._id
        });

        res.status(201).json(patient);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update Patient Visit Status (Cashier/Doctor)
router.patch('/patients/:id/status', protect, authorize('Cashier', 'Doctor', 'Admin'), async (req, res) => {
    try {
        const { visitStatus } = req.body;
        const patient = await Patient.findById(req.params.id);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        patient.visitStatus = visitStatus;
        await patient.save();

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// @desc    Get All Patients
router.get('/patients', protect, async (req, res) => {
    try {
        const patients = await Patient.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Search Patients
router.get('/patients/search', protect, async (req, res) => {
    try {
        const query = cleanString(req.query?.query, { maxLength: 80 });
        if (!query) {
            return res.json([]);
        }

        const escapedQuery = escapeRegex(query);
        const patients = await Patient.find({
            $or: [
                { patientId: { $regex: escapedQuery, $options: 'i' } },
                { name: { $regex: escapedQuery, $options: 'i' } }
            ],
            status: 'Active'
        }).limit(20);
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Patient with Lab History
router.get('/patients/:id', protect, async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Get patient's lab history
        const labHistory = await LabRequest.find({ patientName: patient.name })
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 });

        res.json({ patient, labHistory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Doctor Dashboard
router.get('/dashboard', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const totalPatients = await Patient.countDocuments({ status: 'Active' });

        // Today's patients
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayPatients = await Patient.countDocuments({
            createdAt: { $gte: today }
        });

        // My lab requests
        const myLabRequests = await LabRequest.countDocuments({ doctorId: req.user._id });
        const pendingLabs = await LabRequest.countDocuments({
            doctorId: req.user._id,
            status: { $ne: 'Completed' }
        });

        // Recent patients
        const recentPatients = await Patient.find({ status: 'Active' })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            totalPatients,
            todayPatients,
            myLabRequests,
            pendingLabs,
            recentPatients
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Lab Requests Ready for Review
router.get('/lab-reviews', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const requests = await LabRequest.find({
            doctorId: req.user._id,
            status: 'Awaiting Doctor'
        }).sort({ updatedAt: -1 });

        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const Medicine = require('../models/Medicine');
const Prescription = require('../models/Prescription');

// @desc    Search Medicines for Prescription
router.get('/medicines/search', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const query = (req.query.query || '').trim();
        const requestedLimit = Number.parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(requestedLimit, 1), 200)
            : 100;

        const filter = { totalUnitsInStock: { $gt: 0 } };
        if (query) {
            const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: escapedQuery, $options: 'i' } },
                { category: { $regex: escapedQuery, $options: 'i' } }
            ];
        }

        const medicines = await Medicine.find(filter)
            .sort(query ? { totalUnitsInStock: -1, name: 1 } : { name: 1 })
            .limit(limit);
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create Final Prescription
router.post('/prescriptions', protect, authorize('Doctor', 'Admin'), async (req, res) => {
    try {
        const { patientId, diagnosis, physicalExamination, medicines = [] } = req.body;

        const normalizedMedicines = [];
        for (const item of medicines) {
            let medicineDoc = null;

            if (item?.medicineId && mongoose.Types.ObjectId.isValid(item.medicineId)) {
                medicineDoc = await Medicine.findById(item.medicineId).select('name');
            } else if (item?.name) {
                medicineDoc = await Medicine.findOne({
                    name: { $regex: `^${item.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
                }).select('name');
            }

            normalizedMedicines.push({
                medicineId: medicineDoc?._id || undefined,
                name: medicineDoc?.name || item?.name || '',
                dosage: item?.dosage || '',
                duration: item?.duration || ''
            });
        }

        const prescription = await Prescription.create({
            patientId,
            doctorId: req.user._id,
            diagnosis,
            physicalExamination,
            medicines: normalizedMedicines,
            status: 'Issued'
        });

        // Update patient status back to Outpatient
        await Patient.findByIdAndUpdate(patientId, { visitStatus: 'Outpatient' });

        res.status(201).json(prescription);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;



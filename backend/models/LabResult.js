const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    testType: { type: String, required: true }, // Hematology, Biochemistry, etc.
    hematology: {
        mcv: String,
        mch: String,
        others: String
    },
    biochemistry: {
        glucose: String,
        urea: String,
        others: String
    },
    serology: {
        hiv: String,
        hPylori: String,
        typhoid: String
    },
    microscopy: {
        urine: String,
        stool: String
    },
    notes: String,
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('LabResult', labResultSchema);

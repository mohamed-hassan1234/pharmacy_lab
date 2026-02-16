const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    diagnosis: { type: String, required: true },
    medicines: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        name: String,
        dosage: String,
        duration: String
    }],
    physicalExamination: String,
    status: { type: String, enum: ['Issued', 'Dispensed'], default: 'Issued' }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);

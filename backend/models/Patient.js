const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    patientId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    sex: { type: String, enum: ['Male', 'Female'], required: true },
    phone: { type: String },
    address: { type: String },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    visitStatus: { type: String, enum: ['Outpatient', 'Waiting for Doctor', 'In Consultation'], default: 'Outpatient' }

}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);

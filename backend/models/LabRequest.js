const mongoose = require('mongoose');

const labRequestSchema = new mongoose.Schema({
    ticketNumber: { type: String, required: true, unique: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
    patientId: { type: String },

    patientName: { type: String, required: true },
    age: { type: Number, required: true },
    sex: { type: String, enum: ['Male', 'Female'], required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    doctorName: { type: String, required: true },
    requestedTests: {
        hematology: { type: Boolean, default: false },
        biochemistry: { type: Boolean, default: false },
        serology: { type: Boolean, default: false },
        urinalysis: { type: Boolean, default: false },
        stoolExamination: { type: Boolean, default: false }
    },
    requestedTestInput: { type: String },
    status: {
        type: String,
        enum: ['Pending', 'Awaiting Payment', 'Paid', 'In Progress', 'Results Entered', 'Awaiting Doctor', 'Sent to Cashier', 'Cashier Responded', 'Reviewed', 'Completed'],
        default: 'Pending'
    },
    isPaid: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },

    results: {
        // Hematology
        hematology: {
            hb: { type: String },
            wbc: { type: String },
            rbc: { type: String },
            mcv: { type: String },
            mch: { type: String },
            platelets: { type: String }
        },
        // Biochemistry
        biochemistry: {
            bloodSugar: { type: String },
            urea: { type: String },
            creatinine: { type: String },
            alt: { type: String },
            ast: { type: String },
            others: { type: String }
        },
        // Serology
        serology: {
            hiv: { type: String, enum: ['', 'Positive', 'Negative'] },
            hPylori: { type: String, enum: ['', 'Positive', 'Negative'] },
            typhoid: { type: String, enum: ['', 'Positive', 'Negative'] },
            hepatitis: { type: String }
        },
        // Urinalysis
        urinalysis: {
            color: { type: String },
            protein: { type: String },
            sugar: { type: String },
            microscopy: { type: String }
        },
        // Stool Examination
        stoolExamination: {
            color: { type: String },
            parasites: { type: String },
            microscopy: { type: String }
        }
    },
    resultText: { type: String },
    resultEnteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resultEnteredAt: { type: Date },
    doctorConclusion: { type: String },
    physicalExamination: { type: String },
    medicines: [{
        medicineId: { type: String },
        name: { type: String },
        dosage: { type: String },
        duration: { type: String }
    }],
    sentToCashierAt: { type: Date },
    cashierResponse: { type: String },
    cashierRespondedAt: { type: Date },
    cashierRespondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    finalDecisionAt: { type: Date },
    prescriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
    dispensedSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    dispensedAt: { type: Date },
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorConclusionAt: { type: Date },
    isPrinted: { type: Boolean, default: false },
    printedAt: { type: Date },
    printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('LabRequest', labRequestSchema);


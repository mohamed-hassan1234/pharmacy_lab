import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, FileText, Printer, Clock, CheckCircle, AlertCircle, User, Calendar, FlaskConical, Beaker } from 'lucide-react';


const DoctorConsultation = () => {
    const [labRequests, setLabRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [conclusion, setConclusion] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
    const [medicineSearch, setMedicineSearch] = useState('');
    const [foundMedicines, setFoundMedicines] = useState([]);
    const [prescribedMedicines, setPrescribedMedicines] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [physicalExam, setPhysicalExam] = useState('');

    const getRequestedTestEntries = (requestedTests = {}) => [
        { key: 'hematology', short: 'HEMA', className: 'bg-blue-100 text-blue-600' },
        { key: 'biochemistry', short: 'BIO', className: 'bg-emerald-100 text-emerald-600' },
        { key: 'serology', short: 'SERO', className: 'bg-purple-100 text-purple-600' },
        { key: 'urinalysis', short: 'KAADI', className: 'bg-orange-100 text-orange-600' },
        { key: 'stoolExamination', short: 'SAXARO', className: 'bg-red-100 text-red-600' }
    ].filter((entry) => requestedTests?.[entry.key]);

    const getRequestedTestText = (request) => String(request?.requestedTestInput || '').trim();

    const formatMedicineStock = (medicine) => {
        const unitsPerBox = Number(medicine?.unitsPerBox) || 1;
        const totalUnitsInStock = Number(medicine?.totalUnitsInStock) || 0;
        const boxes = Math.floor(totalUnitsInStock / unitsPerBox);
        const pills = totalUnitsInStock % unitsPerBox;
        return { boxes, pills };
    };

    const buildDispenseText = (boxes, pills) => {
        const boxLabel = boxes === 1 ? 'box' : 'boxes';
        const pillLabel = pills === 1 ? 'pill' : 'pills';
        return `${boxes} ${boxLabel} + ${pills} ${pillLabel}`;
    };

    const parseDispenseText = (dosage) => {
        const text = (dosage || '').toString().toLowerCase();
        const boxMatch = text.match(/(\d+)\s*box/);
        const pillMatch = text.match(/(\d+)\s*pill/);
        return {
            requestedBoxes: boxMatch ? Number.parseInt(boxMatch[1], 10) : 0,
            requestedPills: pillMatch ? Number.parseInt(pillMatch[1], 10) : 0
        };
    };

    const mapMedicinesToForm = (medicines = []) => medicines.map((med) => {
        const parsed = parseDispenseText(med.dosage);
        return {
            medicineId: med.medicineId,
            name: med.name,
            unitsPerBox: 1,
            totalUnitsInStock: 0,
            requestedBoxes: parsed.requestedBoxes,
            requestedPills: parsed.requestedPills,
            dosage: med.dosage || buildDispenseText(parsed.requestedBoxes, parsed.requestedPills),
            duration: med.duration || ''
        };
    });

    const openPrescriptionForm = (request) => {
        setSelectedRequest(request);
        setDiagnosis(request.doctorConclusion || '');
        setPhysicalExam(request.physicalExamination || '');
        setPrescribedMedicines(mapMedicinesToForm(request.medicines || []));
        setShowPrescriptionForm(true);
    };

    const buildMedicinesPayload = () => {
        if (!diagnosis.trim()) {
            alert('Ogaanshaha waa qasab. Fadlan qor ogaanshaha.');
            return null;
        }

        const invalidQty = prescribedMedicines.some((m) => (Number(m.requestedBoxes) || 0) === 0 && (Number(m.requestedPills) || 0) === 0);
        if (invalidQty) {
            alert('Fadlan geli kartoon ama xabbo daawo kasta oo la doortay.');
            return null;
        }

        const missingDuration = prescribedMedicines.some((m) => !m.duration || !m.duration.trim());
        if (missingDuration) {
            alert('Fadlan geli muddada daawo kasta oo la doortay.');
            return null;
        }

        return prescribedMedicines.map((m) => ({
            medicineId: m.medicineId,
            name: m.name,
            dosage: buildDispenseText(Number(m.requestedBoxes) || 0, Number(m.requestedPills) || 0),
            duration: m.duration
        }));
    };


    useEffect(() => {
        fetchMyLabRequests();
        // Auto-refresh every 10 seconds to see new results
        const interval = setInterval(fetchMyLabRequests, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchMyLabRequests = async () => {
        try {
            const userStr = localStorage.getItem('clinic_user');
            if (!userStr) return;
            const userObj = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userObj.token}` } };

            const { data } = await axios.get('/api/lab/requests', config);
            setLabRequests(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };


    const handleViewResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get(`/api/lab/requests/${request._id}`, config);
            setSelectedRequest(data);
            setConclusion(data.doctorConclusion || '');
            setShowResults(true);
        } catch (err) { console.error(err); }
    };

    const handleSaveConclusion = async () => {
        // We now bypass this separate step in favor of the unified consultation
        setDiagnosis(conclusion);
        setShowResults(false);
        setShowPrescriptionForm(true);
    };


    const fetchAvailableMedicines = async (query = '') => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get(`/api/doctor/medicines/search?query=${encodeURIComponent(query)}&limit=100`, config);
            setFoundMedicines(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const handleSearchMedicine = async (query) => {
        setMedicineSearch(query);
        await fetchAvailableMedicines(query);
    };

    useEffect(() => {
        if (showPrescriptionForm) {
            fetchAvailableMedicines('');
        } else {
            setFoundMedicines([]);
            setMedicineSearch('');
        }
    }, [showPrescriptionForm]);

    const addMedicine = (med) => {
        if (prescribedMedicines.find(m => m.medicineId === med._id)) return;
        const unitsPerBox = Number(med.unitsPerBox) || 1;
        const totalUnitsInStock = Number(med.totalUnitsInStock) || 0;
        setPrescribedMedicines([...prescribedMedicines, {
            medicineId: med._id,
            name: med.name,
            unitsPerBox,
            totalUnitsInStock,
            requestedBoxes: 0,
            requestedPills: 0,
            dosage: buildDispenseText(0, 0),
            duration: ''
        }]);
        setMedicineSearch('');
    };

    const updateRequestedQuantity = (index, field, rawValue) => {
        const parsedValue = Number.parseInt(rawValue, 10);
        const safeValue = Number.isNaN(parsedValue) ? 0 : Math.max(0, parsedValue);

        setPrescribedMedicines((prev) => prev.map((item, i) => {
            if (i !== index) return item;

            const unitsPerBox = Number(item.unitsPerBox) || 1;
            const totalUnitsInStock = Number(item.totalUnitsInStock) || 0;
            const maxBoxes = totalUnitsInStock > 0
                ? Math.floor(totalUnitsInStock / unitsPerBox)
                : safeValue;

            let requestedBoxes = Number(item.requestedBoxes) || 0;
            let requestedPills = Number(item.requestedPills) || 0;

            if (field === 'requestedBoxes') {
                requestedBoxes = Math.min(safeValue, maxBoxes);
            } else {
                requestedPills = safeValue;
            }

            if (totalUnitsInStock > 0) {
                const remainingUnitsAfterBoxes = Math.max(0, totalUnitsInStock - (requestedBoxes * unitsPerBox));
                requestedPills = Math.min(requestedPills, remainingUnitsAfterBoxes);
            }

            return {
                ...item,
                requestedBoxes,
                requestedPills,
                dosage: buildDispenseText(requestedBoxes, requestedPills)
            };
        }));
    };

    const resetConsultationState = () => {
        setPrescribedMedicines([]);
        setDiagnosis('');
        setPhysicalExam('');
        setSelectedRequest(null);
        setShowPrescriptionForm(false);
        setShowResults(false);
    };

    const handleSendToCashier = async () => {
        const medicinesPayload = buildMedicinesPayload();
        if (!medicinesPayload || !selectedRequest) return;

        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`/api/lab/requests/${selectedRequest._id}/send-to-cashier`, {
                physicalExamination: physicalExam,
                conclusion: diagnosis,
                medicines: medicinesPayload
            }, config);

            alert('Qoraalka daawada waxaa loo diray qasnajiga.');
            resetConsultationState();
            fetchMyLabRequests();
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay dirista qoraalka qasnajiga.'); }
    };

    const handleFinalizeDecision = async () => {
        const medicinesPayload = buildMedicinesPayload();
        if (!medicinesPayload || !selectedRequest) return;

        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const payload = {
                patientId: selectedRequest.patient?._id || selectedRequest.patient,
                diagnosis,
                physicalExamination: physicalExam,
                medicines: medicinesPayload
            };

            const { data: createdPrescription } = await axios.post('/api/doctor/prescriptions', payload, config);

            await axios.patch(`/api/lab/requests/${selectedRequest._id}/finalize`, {
                conclusion: diagnosis,
                physicalExamination: physicalExam,
                medicines: medicinesPayload,
                prescriptionId: createdPrescription?._id
            }, config);

            await axios.patch(`/api/doctor/patients/${selectedRequest.patient?._id || selectedRequest.patient}/status`, { visitStatus: 'Outpatient' }, config);

            if (window.confirm('Go\'aanka dambe waa la keydiyey bukaankana waxaa loo diray qasnaji/farmashiye. Ma doonaysaa in hadda la daabaco?')) {
                handlePrintResults({
                    ...selectedRequest,
                    diagnosis,
                    physicalExamination: physicalExam,
                    medicines: medicinesPayload
                });
            }

            resetConsultationState();
            fetchMyLabRequests();
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay keydinta warqadda daawada.'); }
    };


    const handlePrintResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`/api/lab/requests/${request._id}/print`, {}, config);

            const printWindow = window.open('', '', 'width=800,height=1000');

            // Merge diagnosis and medicines if it's a final report
            const reportData = {
                ...request,
                diagnosis: request.doctorConclusion || diagnosis,
                medicines: request.medicines || prescribedMedicines || []
            };

            printWindow.document.write(`

                <html><head><title>Lab Results - ${request.ticketNumber}</title>
                <style>
                    body { font-family: Arial; padding: 40px; }
                    h1 { text-align: center; color: #1e293b; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 20px; }
                    .patient-info { margin: 20px 0; background: #f1f5f9; padding: 15px; border-radius: 8px; }
                    .section { margin: 30px 0; }
                    .section-title { font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
                    .label { font-weight: bold; width: 40%; }
                    .signature { margin-top: 60px; display: flex; justify-content: space-between; }
                    .sig-line { border-top: 1px solid #000; width: 200px; text-align: center; padding-top: 5px; }
                </style></head><body>
                <div class="header">
                    <h1>MEDICAL CLINIC REPORT</h1>
                    <p><strong>Ticket Number:</strong> ${reportData.ticketNumber}</p>
                </div>
                <div class="patient-info">
                    <p><strong>Patient Name:</strong> ${reportData.patientName}</p>
                    <p><strong>Age:</strong> ${reportData.age} years | <strong>Sex:</strong> ${reportData.sex}</p>
                    <p><strong>Date:</strong> ${new Date(reportData.createdAt).toLocaleDateString()}</p>
                    <p><strong>Referencing Doctor:</strong> ${reportData.doctorName}</p>
                    ${reportData.requestedTestInput ? `<p><strong>Requested Test:</strong> ${reportData.requestedTestInput}</p>` : ''}
                </div>
                ${reportData.resultText ? `
                <div class="section">
                    <div class="section-title">LAB RESULT</div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;white-space:pre-wrap;">${reportData.resultText}</div>
                </div>` : ''}
                ${!reportData.resultText && reportData.requestedTests.hematology ? `
                <div class="section">
                    <div class="section-title">HEMATOLOGY</div>
                    <table>
                        <tr><td class="label">HB:</td><td>${reportData.results.hematology.hb || 'N/A'}</td></tr>
                        <tr><td class="label">WBC:</td><td>${reportData.results.hematology.wbc || 'N/A'}</td></tr>
                        <tr><td class="label">RBC:</td><td>${reportData.results.hematology.rbc || 'N/A'}</td></tr>
                        <tr><td class="label">MCV:</td><td>${reportData.results.hematology.mcv || 'N/A'}</td></tr>
                        <tr><td class="label">MCH:</td><td>${reportData.results.hematology.mch || 'N/A'}</td></tr>
                        <tr><td class="label">Platelets:</td><td>${reportData.results.hematology.platelets || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}

                ${!reportData.resultText && reportData.requestedTests.biochemistry ? `
                <div class="section">
                    <div class="section-title">BIOCHEMISTRY</div>
                    <table>
                        <tr><td class="label">Blood Sugar:</td><td>${reportData.results.biochemistry.bloodSugar || 'N/A'}</td></tr>
                        <tr><td class="label">Urea:</td><td>${reportData.results.biochemistry.urea || 'N/A'}</td></tr>
                        <tr><td class="label">Creatinine:</td><td>${reportData.results.biochemistry.creatinine || 'N/A'}</td></tr>
                        <tr><td class="label">ALT:</td><td>${reportData.results.biochemistry.alt || 'N/A'}</td></tr>
                        <tr><td class="label">AST:</td><td>${reportData.results.biochemistry.ast || 'N/A'}</td></tr>
                        <tr><td class="label">Others:</td><td>${reportData.results.biochemistry.others || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${!reportData.resultText && reportData.requestedTests.serology ? `
                <div class="section">
                    <div class="section-title">SEROLOGY</div>
                    <table>
                        <tr><td class="label">HIV:</td><td>${reportData.results.serology.hiv || 'N/A'}</td></tr>
                        <tr><td class="label">H. Pylori:</td><td>${reportData.results.serology.hPylori || 'N/A'}</td></tr>
                        <tr><td class="label">Typhoid:</td><td>${reportData.results.serology.typhoid || 'N/A'}</td></tr>
                        <tr><td class="label">Hepatitis:</td><td>${reportData.results.serology.hepatitis || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${!reportData.resultText && reportData.requestedTests.urinalysis ? `
                <div class="section">
                    <div class="section-title">URINALYSIS</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${reportData.results.urinalysis.color || 'N/A'}</td></tr>
                        <tr><td class="label">Protein:</td><td>${reportData.results.urinalysis.protein || 'N/A'}</td></tr>
                        <tr><td class="label">Sugar:</td><td>${reportData.results.urinalysis.sugar || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${reportData.results.urinalysis.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${!reportData.resultText && reportData.requestedTests.stoolExamination ? `
                <div class="section">
                    <div class="section-title">STOOL EXAMINATION</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${reportData.results.stoolExamination.color || 'N/A'}</td></tr>
                        <tr><td class="label">Parasites:</td><td>${reportData.results.stoolExamination.parasites || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${reportData.results.stoolExamination.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                <div class="signature">
                <div class="sig-line">Doctor Signature</div>
                <div class="sig-line">Date: ${new Date().toLocaleDateString()}</div>
            </div>

            ${reportData.doctorConclusion || reportData.diagnosis ? `
            <div class="section" style="margin-top: 50px; background: #fffbeb; padding: 20px; border-radius: 15px; border: 2px solid #fcd34d;">
                <div class="section-title" style="color: #92400e; border-color: #fcd34d;">DOCTOR'S DIAGNOSIS & TREATMENT</div>
                <p><strong>Diagnosis:</strong> ${reportData.doctorConclusion || reportData.diagnosis || 'N/A'}</p>
                <p><strong>Physical Exam:</strong> ${reportData.physicalExamination || 'N/A'}</p>
                
                <div class="section-title" style="margin-top: 20px; color: #92400e; border-color: #fcd34d;">PRESCRIBED MEDICINES</div>
                <table style="background: white;">
                    <tr style="background: #fef3c7; font-weight: bold;">
                        <td>Medicine</td><td>Dosage</td><td>Duration</td>
                    </tr>
                    ${(reportData.medicines || []).map(m => `
                        <tr>
                            <td>${m.name}</td><td>${m.dosage}</td><td>${m.duration}</td>
                        </tr>
                    `).join('')}
                    ${(!reportData.medicines || reportData.medicines.length === 0) ? '<tr><td colspan="3">No medicines prescribed.</td></tr>' : ''}
                </table>
            </div>` : ''}

                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
            fetchMyLabRequests();
        } catch (err) { alert(err.response?.data?.message || 'Error printing results'); }
    };

    const filtered = labRequests
        .filter(r =>
            r.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
            r.patientName.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const order = { 'Awaiting Doctor': 0, 'Cashier Responded': 1, 'Sent to Cashier': 2, 'In Progress': 3, 'Paid': 4, 'Pending': 5, 'Reviewed': 6, 'Completed': 7 };
            const statusA = order[a.status] ?? 99;
            const statusB = order[b.status] ?? 99;
            if (statusA !== statusB) return statusA - statusB;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });


    const readyCount = labRequests.filter(r => ['Awaiting Doctor', 'Cashier Responded'].includes(r.status)).length;
    const sentCount = labRequests.filter(r => r.status === 'Sent to Cashier').length;

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <FileText size={30} className="text-primary" /> Qolka La-talinta
                </h1>
                <p className="section-subtitle">Eeg natiijooyinka, u dir qoraalka qasnajiga, hel jawaabta qasnajiga, ka dibna samee go'aanka ugu dambeeya.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card border-l-4 border-blue-500">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                            <FileText className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-blue-600">{labRequests.length}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Wadarta Codsiyada</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Dhammaan codsiyada shaybaarka ee aad samaysay</p>
                </div>

                <div className="card border-l-4 border-amber-500">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                            <Clock className="text-orange-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-orange-600">{readyCount}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Shaqada Dhakhtarka</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Waxay sugayaan dib-u-eegistaada ama go'aankaaga dambe</p>
                </div>

                <div className="card border-l-4 border-primary">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
                            <CheckCircle className="text-emerald-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-emerald-600">{sentCount}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loo Diray Qasnajiga</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Waxay sugayaan qoraalka qasnajiga</p>
                </div>

            </div>

            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Ku raadi tigidh ama magaca bukaanka..."
                        className="w-full pl-12"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lab Requests List */}
            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Codsiyadayda Shaybaarka ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Si toos ah ayuu isu cusboonaysiiyaa 10 ilbiriqsi kasta</p>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Tigidh</th>
                                <th>Bukaan</th>
                                <th>Baaritaanno</th>
                                <th>Lacag-bixin</th>
                                <th>Xaalad</th>
                                <th>Taariikh</th>
                                <th>Falal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((req) => (
                                <tr key={req._id}>
                                    {(() => {
                                        const requestedTestEntries = getRequestedTestEntries(req.requestedTests);
                                        const requestedTestText = getRequestedTestText(req);

                                        return (
                                            <>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-emerald-600">{req.ticketNumber}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{req.patientName}</p>
                                        <p className="text-xs text-slate-400 font-bold">{req.age} sano • {req.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            {requestedTestEntries.map((entry) => (
                                                <span key={entry.key} className={`text-[9px] font-black px-2 py-0.5 rounded ${entry.className}`}>
                                                    {entry.short}
                                                </span>
                                            ))}
                                        </div>
                                        {requestedTestText ? (
                                            <p className="mt-2 text-xs font-bold text-slate-500 whitespace-pre-wrap">{requestedTestText}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${req.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {req.isPaid ? 'LA BIXIYEY' : 'LAGU LEEYAHAY'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            {['Awaiting Doctor', 'Cashier Responded'].includes(req.status) && (
                                                <span className="animate-bounce bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">CUSUB</span>
                                            )}
                                            {req.status === 'Completed' || req.status === 'Reviewed' ? <CheckCircle size={16} className="text-emerald-600" /> : <Clock size={16} className="text-orange-600 animate-pulse" />}
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${['Completed', 'Reviewed'].includes(req.status) ? 'bg-emerald-100 text-emerald-600' :
                                                ['Awaiting Doctor', 'Cashier Responded'].includes(req.status) ? 'bg-blue-100 text-blue-600' :
                                                    req.status === 'Sent to Cashier' ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-600'
                                                }`}>
                                                {req.status === 'Awaiting Doctor' ? 'Diyaar u ah Dib-u-eegis' :
                                                    req.status === 'Cashier Responded' ? 'Qasnaji Jawaabay' :
                                                        req.status === 'Sent to Cashier' ? 'Loo Diray Qasnaji' :
                                                            req.status}
                                            </span>
                                        </div>
                                    </td>


                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(req.createdAt).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            {['Awaiting Doctor', 'Sent to Cashier', 'Cashier Responded', 'Reviewed', 'Completed'].includes(req.status) ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            openPrescriptionForm(req);
                                                        }}
                                                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-colors ${req.status === 'Awaiting Doctor'
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                                                            : req.status === 'Cashier Responded'
                                                                ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/20'
                                                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                            }`}
                                                    >
                                                        <FileText size={16} />
                                                        {req.status === 'Awaiting Doctor' ? 'Diyaari Qoraalka' :
                                                            req.status === 'Sent to Cashier' ? 'Eeg Qoraalka La Diray' :
                                                                req.status === 'Cashier Responded' ? 'Go\'aanka Dambe' :
                                                                    'Eeg La-talinta'}
                                                    </button>

                                                    <button
                                                        onClick={() => handlePrintResults(req)}
                                                        className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                        title="Daabac"
                                                    >
                                                    <Printer size={18} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-black text-xs uppercase flex items-center gap-2">
                                                    <Clock size={16} className="animate-pulse" /> Shaybaar Sugaya
                                            </span>
                                        )}
                                        </div>
                                    </td>
                                            </>
                                        );
                                    })()}

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results Modal */}
            {showResults && selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Natiijooyinka Shaybaarka</h3>
                                <p className="text-slate-600 font-bold">{selectedRequest.patientName} • {selectedRequest.ticketNumber}</p>
                            </div>
                            <button onClick={() => setShowResults(false)} className="px-6 py-3 bg-slate-100 rounded-2xl font-black uppercase hover:bg-slate-200">
                                Xir
                            </button>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-2xl mb-6 border-2 border-blue-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Bukaan</p>
                                    <p className="font-black text-slate-800">{selectedRequest.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Age & Sex</p>
                                    <p className="font-black text-slate-800">{selectedRequest.age} years • {selectedRequest.sex}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Payment Status</p>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${selectedRequest.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {selectedRequest.isPaid ? 'Fully Paid' : 'Pending Payment'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Amount Paid</p>
                                    <p className="font-black text-slate-800">${selectedRequest.amount || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Ticket Number</p>
                                    <p className="font-black text-blue-600">{selectedRequest.ticketNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Date</p>
                                    <p className="font-black text-slate-800">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                                </div>

                            </div>
                        </div>

                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                            {selectedRequest.resultText ? (
                                <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                                    <h4 className="text-lg font-black text-emerald-900 mb-4 uppercase">Lab Result</h4>
                                    {selectedRequest.requestedTestInput && (
                                        <div className="bg-white p-4 rounded-xl mb-4">
                                            <p className="text-xs font-black text-slate-400 uppercase">Requested Test</p>
                                            <p className="text-base font-black text-slate-800 whitespace-pre-wrap">{selectedRequest.requestedTestInput}</p>
                                        </div>
                                    )}
                                    <div className="bg-white p-4 rounded-xl">
                                        <p className="text-xs font-black text-slate-400 uppercase mb-2">Result</p>
                                        <p className="text-base font-black text-slate-800 whitespace-pre-wrap">{selectedRequest.resultText}</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                            {/* Hematology */}
                            {selectedRequest.requestedTests.hematology && (
                                <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
                                    <h4 className="text-lg font-black text-blue-900 mb-4 uppercase">Hematology Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">HB</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.hb || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">WBC</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.wbc || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">RBC</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.rbc || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">MCV</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.mcv || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">MCH</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.mch || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Platelets</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.hematology.platelets || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Biochemistry */}
                            {selectedRequest.requestedTests.biochemistry && (
                                <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                                    <h4 className="text-lg font-black text-emerald-900 mb-4 uppercase">Biochemistry Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Blood Sugar</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.bloodSugar || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Urea</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.urea || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Creatinine</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.creatinine || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">ALT</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.alt || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">AST</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.ast || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Others</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.biochemistry.others || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Serology */}
                            {selectedRequest.requestedTests.serology && (
                                <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100">
                                    <h4 className="text-lg font-black text-purple-900 mb-4 uppercase">Serology Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">HIV</p>
                                            <p className={`text-xl font-black ${selectedRequest.results.serology.hiv === 'Positive' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {selectedRequest.results.serology.hiv || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">H. Pylori</p>
                                            <p className={`text-xl font-black ${selectedRequest.results.serology.hPylori === 'Positive' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {selectedRequest.results.serology.hPylori || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Typhoid</p>
                                            <p className={`text-xl font-black ${selectedRequest.results.serology.typhoid === 'Positive' ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {selectedRequest.results.serology.typhoid || 'N/A'}
                                            </p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Hepatitis</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.serology.hepatitis || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Urinalysis */}
                            {selectedRequest.requestedTests.urinalysis && (
                                <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100">
                                    <h4 className="text-lg font-black text-orange-900 mb-4 uppercase">Urinalysis Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Color</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.urinalysis.color || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Protein</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.urinalysis.protein || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Sugar</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.urinalysis.sugar || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Microscopy</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.urinalysis.microscopy || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stool Examination */}
                            {selectedRequest.requestedTests.stoolExamination && (
                                <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100">
                                    <h4 className="text-lg font-black text-red-900 mb-4 uppercase">Stool Examination Results</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Color</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.stoolExamination.color || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl">
                                            <p className="text-xs font-black text-slate-400 uppercase">Parasites</p>
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.stoolExamination.parasites || 'N/A'}</p>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl col-span-2">
                                            <p className="text-xl font-black text-slate-800">{selectedRequest.results.stoolExamination.microscopy || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                                </>
                            )}
                        </div>

                        {/* Conclusion Section */}
                        <div className="bg-slate-900 p-8 rounded-[2rem] border-2 border-slate-700 shadow-2xl mt-8">
                            <h4 className="text-xl font-black text-white mb-4 uppercase italic flex items-center gap-3">
                                <CheckCircle className="text-emerald-400" /> Doctor's Conclusion
                            </h4>
                            {selectedRequest.status === 'Awaiting Doctor' ? (
                                <div className="space-y-4">
                                    <textarea
                                        className="w-full bg-slate-800 border-none rounded-2xl p-6 text-white font-bold placeholder:text-slate-500 min-h-[150px] focus:ring-2 focus:ring-emerald-500"
                                        placeholder="Enter your diagnosis or conclusion here..."
                                        value={conclusion}
                                        onChange={e => setConclusion(e.target.value)}
                                    ></textarea>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-2">This will be visible to the cashier and patient.</p>
                                </div>
                            ) : (
                                <div className="bg-slate-800 p-6 rounded-2xl min-h-[100px] border border-slate-700">
                                    <p className="text-white font-bold whitespace-pre-wrap">
                                        {selectedRequest.doctorConclusion || 'No conclusion provided yet.'}
                                    </p>
                                    {selectedRequest.doctorConclusionAt && (
                                        <p className="text-[10px] text-slate-500 font-black uppercase mt-4 tracking-widest">
                                            Finalized on {new Date(selectedRequest.doctorConclusionAt).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setShowResults(false)}
                                className="px-8 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Close
                            </button>
                            {selectedRequest.status === 'Awaiting Doctor' ? (
                                <button
                                    onClick={handleSaveConclusion}
                                    disabled={!conclusion.trim()}
                                    className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <CheckCircle size={20} /> Save Conclusion & Finalize
                                </button>
                            ) : (
                                <button
                                    onClick={() => handlePrintResults(selectedRequest)}
                                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-2"
                                >
                                    <Printer size={20} /> Print Report
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* Final Consultation Split-Modal */}
            {showPrescriptionForm && selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-2xl z-[110] flex items-center justify-center p-4 overflow-hidden">
                    <div className="bg-white w-full max-w-[95%] h-[92vh] rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row">

                        {/* LEFT PANEL: Lab Results Review */}
                        <div className="w-full md:w-1/3 bg-slate-50 border-r-2 border-slate-100 overflow-y-auto p-8 custom-scrollbar">
                            <h3 className="text-xl font-black text-slate-800 uppercase italic mb-6 flex items-center gap-2">
                                <FlaskConical className="text-blue-600" /> Patient Lab Results
                            </h3>

                            <div className="space-y-6">
                                {selectedRequest.resultText ? (
                                    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Lab Result</h4>
                                        {selectedRequest.requestedTestInput && (
                                            <div className="mb-4">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Requested Test</p>
                                                <p className="text-sm font-black text-slate-800 whitespace-pre-wrap">{selectedRequest.requestedTestInput}</p>
                                            </div>
                                        )}
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-sm font-black text-slate-800 whitespace-pre-wrap">{selectedRequest.resultText}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                {selectedRequest.results.hematology && (
                                    <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase mb-4 tracking-widest">Hematology</h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedRequest.results.hematology).map(([key, val]) => val && (
                                                <div key={key} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-sm font-black text-slate-800">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.results.biochemistry && (
                                    <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-4 tracking-widest">Biochemistry</h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedRequest.results.biochemistry).map(([key, val]) => val && (
                                                <div key={key} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-sm font-black text-slate-800">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.results.serology && (
                                    <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-purple-600 uppercase mb-4 tracking-widest">Serology</h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedRequest.results.serology).map(([key, val]) => val && (
                                                <div key={key} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-sm font-black text-slate-800">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.results.urinalysis && (
                                    <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-orange-600 uppercase mb-4 tracking-widest">Urinalysis</h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedRequest.results.urinalysis).map(([key, val]) => val && (
                                                <div key={key} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-sm font-black text-slate-800">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedRequest.results.stoolExamination && (
                                    <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm transition-all hover:shadow-md">
                                        <h4 className="text-[10px] font-black text-red-600 uppercase mb-4 tracking-widest">Stool Exam</h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedRequest.results.stoolExamination).map(([key, val]) => val && (
                                                <div key={key} className="flex justify-between border-b border-slate-50 pb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{key}</span>
                                                    <span className="text-sm font-black text-slate-800">{val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Consultation & Prescription */}
                        <div className="flex-1 overflow-y-auto p-12 relative flex flex-col custom-scrollbar">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-4xl font-black text-slate-800 uppercase italic">Socodka Qoraalka Dhakhtarka</h3>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-[0.3em]">Bukaan: {selectedRequest.patientName} | Tigidh: {selectedRequest.ticketNumber}</p>
                                </div>
                                <button onClick={() => setShowPrescriptionForm(false)} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-full transition-all hover:rotate-90">
                                    <Search className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] mb-4 px-2 group-focus-within:text-emerald-500 transition-colors">1. Ogaanshaha</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 font-bold text-xl text-slate-800 focus:border-emerald-500 focus:bg-white outline-none h-56 shadow-inner transition-all resize-none"
                                            placeholder="Halkan ku qor qoraalka dhakhtarka ama ogaanshaha dambe..."
                                            value={diagnosis}
                                            onChange={e => setDiagnosis(e.target.value)}
                                            readOnly={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                        ></textarea>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] mb-4 px-2 group-focus-within:text-blue-500 transition-colors">2. Baaritaanka Jirka / Faahfaahin</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 font-bold text-slate-800 focus:border-blue-500 focus:bg-white outline-none h-44 shadow-inner transition-all resize-none"
                                            placeholder="Halkan ku qor waxyaabaha baaritaanka jirka ama faahfaahin dheeraad ah..."
                                            value={physicalExam}
                                            onChange={e => setPhysicalExam(e.target.value)}
                                            readOnly={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                        ></textarea>
                                    </div>
                                    {selectedRequest.cashierResponse && (
                                        <div className="rounded-[2rem] border-2 border-amber-200 bg-amber-50 p-6">
                                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-[.3em] mb-3">Cashier Reply / Jawaabta Qasnajiga</p>
                                            <p className="font-bold text-slate-700 whitespace-pre-wrap">{selectedRequest.cashierResponse}</p>
                                            {selectedRequest.cashierRespondedAt && (
                                                <p className="text-xs font-black text-amber-700 mt-3">
                                                    La helay: {new Date(selectedRequest.cashierRespondedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] px-2">3. Qor Daawooyinka</label>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-5">
                                            <div className="relative mb-3">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                <input
                                                    type="text"
                                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-800 focus:border-emerald-500 outline-none transition-all"
                                                    placeholder="Raadi magaca daawada ama qaybta..."
                                                    value={medicineSearch}
                                                    onChange={e => handleSearchMedicine(e.target.value)}
                                                    onFocus={() => {
                                                        if (!medicineSearch.trim()) fetchAvailableMedicines('');
                                                    }}
                                                    disabled={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Daawooyinka Jira</p>

                                            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                                {foundMedicines.length === 0 ? (
                                                    <div className="bg-white rounded-2xl p-6 border border-dashed border-slate-200 text-center">
                                                        <p className="text-xs font-bold text-slate-400">Daawo lama helin.</p>
                                                    </div>
                                                ) : foundMedicines.map((med) => {
                                                    const stock = formatMedicineStock(med);
                                                    const isSelected = prescribedMedicines.some((item) => item.medicineId === med._id);
                                                    return (
                                                        <button
                                                            key={med._id}
                                                            type="button"
                                                            onClick={() => addMedicine(med)}
                                                            disabled={isSelected || ['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                            className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200 opacity-70 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}
                                                        >
                                                            <p className="font-black text-slate-800 uppercase italic flex items-center gap-2">
                                                                <Beaker size={15} className="text-emerald-500" /> {med.name}
                                                            </p>
                                                            <div className="flex justify-between items-center mt-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{med.category || 'Guud'}</span>
                                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                                    {stock.boxes} Kartoon + {stock.pills} Xabbo
                                                                </span>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-5">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Daawooyinka La Doortay</p>
                                            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                                                {prescribedMedicines.length === 0 ? (
                                                    <div className="bg-slate-50 rounded-2xl p-10 border border-dashed border-slate-200 text-center">
                                                        <p className="text-xs font-bold text-slate-400 uppercase">Ka dooro daawo dhinaca bidix</p>
                                                    </div>
                                                ) : prescribedMedicines.map((item, index) => {
                                                    const stock = formatMedicineStock(item);
                                                    return (
                                                        <div key={index} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                                <div>
                                                                    <p className="font-black text-slate-800 uppercase italic">{item.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                                        Jira: {stock.boxes} Kartoon + {stock.pills} Xabbo
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPrescribedMedicines(prescribedMedicines.filter((_, i) => i !== index))}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                                    disabled={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                                >
                                                                    <Search className="rotate-45" size={18} />
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Kartoon</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-full bg-white rounded-xl border border-slate-200 p-2 text-sm font-bold outline-none focus:border-emerald-400"
                                                                        value={item.requestedBoxes}
                                                                        onChange={(e) => updateRequestedQuantity(index, 'requestedBoxes', e.target.value)}
                                                                        disabled={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Xabbo</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        className="w-full bg-white rounded-xl border border-slate-200 p-2 text-sm font-bold outline-none focus:border-emerald-400"
                                                                        value={item.requestedPills}
                                                                        onChange={(e) => updateRequestedQuantity(index, 'requestedPills', e.target.value)}
                                                                        disabled={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[9px] font-black text-slate-400 uppercase">Muddo</label>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="tusaale 5 maalmood"
                                                                        className="w-full bg-white rounded-xl border border-slate-200 p-2 text-sm font-bold outline-none focus:border-emerald-400"
                                                                        value={item.duration}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            setPrescribedMedicines((prev) => prev.map((med, i) => i === index ? { ...med, duration: value } : med));
                                                                        }}
                                                                        disabled={['Completed', 'Reviewed'].includes(selectedRequest.status)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1 inline-block">
                                                                Bixi: {item.dosage || buildDispenseText(0, 0)}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-10 border-t-2 border-slate-50 flex gap-6">
                                <button
                                    onClick={() => setShowPrescriptionForm(false)}
                                    className="px-12 bg-slate-100 text-slate-600 font-black py-6 rounded-[2.5rem] uppercase italic tracking-widest hover:bg-slate-200 transition-all border-b-4 border-slate-200"
                                >
                                    Xir
                                </button>
                                {selectedRequest.status === 'Cashier Responded' ? (
                                    <button
                                        onClick={handleFinalizeDecision}
                                        className="flex-1 bg-emerald-600 text-white font-black py-6 rounded-[2.5rem] uppercase italic tracking-[.2em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-2xl border-b-4 border-emerald-800"
                                    >
                                        <CheckCircle size={36} className="drop-shadow-lg" /> Go'aanka Dambe
                                    </button>
                                ) : selectedRequest.status === 'Completed' || selectedRequest.status === 'Reviewed' ? (
                                    <button
                                        onClick={() => handlePrintResults(selectedRequest)}
                                        className="flex-1 bg-blue-600 text-white font-black py-6 rounded-[2.5rem] uppercase italic tracking-[.2em] shadow-2xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-2xl border-b-4 border-blue-800"
                                    >
                                        <Printer size={36} className="drop-shadow-lg" /> Daabac Warbixinta
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSendToCashier}
                                        className="flex-1 bg-amber-600 text-white font-black py-6 rounded-[2.5rem] uppercase italic tracking-[.16em] shadow-2xl shadow-amber-500/30 hover:bg-amber-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-xl border-b-4 border-amber-800"
                                    >
                                        <CheckCircle size={32} className="drop-shadow-lg" /> U Dir Qasnajiga
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultation;







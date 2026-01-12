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

            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/lab/requests', config);

            // Filter to show only this doctor's requests with safety check
            const myRequests = data.filter(req => req.doctorId?._id === userObj.user?._id);
            setLabRequests(myRequests);
        } catch (err) { console.error(err); }
    };


    const handleViewResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get(`https://lafoole.somsoftsystems.com/api/lab/requests/${request._id}`, config);
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


    const handleSearchMedicine = async (query) => {
        setMedicineSearch(query);
        if (query.length < 2) return setFoundMedicines([]);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get(`https://lafoole.somsoftsystems.com/api/doctor/medicines/search?query=${query}`, config);
            setFoundMedicines(data);
        } catch (err) { console.error(err); }
    };

    const addMedicine = (med) => {
        if (prescribedMedicines.find(m => m.medicineId === med._id)) return;
        setPrescribedMedicines([...prescribedMedicines, {
            medicineId: med._id,
            name: med.name,
            dosage: '',
            duration: ''
        }]);
        setFoundMedicines([]);
        setMedicineSearch('');
    };

    const handleSavePrescription = async () => {
        if (!diagnosis) return alert('Diagnosis is required');
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const payload = {
                patientId: selectedRequest.patient?._id || selectedRequest.patient,
                diagnosis,
                physicalExamination: physicalExam,
                medicines: prescribedMedicines
            };

            // Save Prescription
            await axios.post('https://lafoole.somsoftsystems.com/api/doctor/prescriptions', payload, config);

            // Finalize Lab Request
            await axios.patch(`https://lafoole.somsoftsystems.com/api/lab/requests/${selectedRequest._id}/finalize`, {
                conclusion: diagnosis,
                physicalExamination: physicalExam,
                medicines: prescribedMedicines
            }, config);

            // Update Patient Status
            await axios.patch(`https://lafoole.somsoftsystems.com/api/doctor/patients/${selectedRequest.patient?._id || selectedRequest.patient}/status`, { visitStatus: 'Outpatient' }, config);

            if (window.confirm('Consultation finalized! Patient sent to pharmacy. Would you like to print the report now?')) {
                handlePrintResults({
                    ...selectedRequest,
                    diagnosis,
                    physicalExamination: physicalExam,
                    medicines: prescribedMedicines
                });
            }

            setPrescribedMedicines([]);
            setDiagnosis('');
            setPhysicalExam('');
            setShowPrescriptionForm(false);
            setShowResults(false);
            fetchMyLabRequests();
        } catch (err) { alert(err.response?.data?.message || 'Error saving prescription'); }
    };


    const handlePrintResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/lab/requests/${request._id}/print`, {}, config);

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
                </div>
                ${reportData.requestedTests.hematology ? `
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

                ${reportData.requestedTests.biochemistry ? `
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
                ${reportData.requestedTests.serology ? `
                <div class="section">
                    <div class="section-title">SEROLOGY</div>
                    <table>
                        <tr><td class="label">HIV:</td><td>${reportData.results.serology.hiv || 'N/A'}</td></tr>
                        <tr><td class="label">H. Pylori:</td><td>${reportData.results.serology.hPylori || 'N/A'}</td></tr>
                        <tr><td class="label">Typhoid:</td><td>${reportData.results.serology.typhoid || 'N/A'}</td></tr>
                        <tr><td class="label">Hepatitis:</td><td>${reportData.results.serology.hepatitis || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${reportData.requestedTests.urinalysis ? `
                <div class="section">
                    <div class="section-title">URINALYSIS</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${reportData.results.urinalysis.color || 'N/A'}</td></tr>
                        <tr><td class="label">Protein:</td><td>${reportData.results.urinalysis.protein || 'N/A'}</td></tr>
                        <tr><td class="label">Sugar:</td><td>${reportData.results.urinalysis.sugar || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${reportData.results.urinalysis.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${reportData.requestedTests.stoolExamination ? `
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
            const order = { 'Awaiting Doctor': 0, 'In Progress': 1, 'Paid': 2, 'Pending': 3, 'Reviewed': 4, 'Completed': 5 };
            const statusA = order[a.status] ?? 99;
            const statusB = order[b.status] ?? 99;
            if (statusA !== statusB) return statusA - statusB;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });


    const pendingCount = labRequests.filter(r => r.status === 'Pending').length;
    const readyCount = labRequests.filter(r => r.status === 'Awaiting Doctor').length;
    const completedCount = labRequests.filter(r => ['Reviewed', 'Completed'].includes(r.status)).length;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                        <FileText size={48} className="text-emerald-400" /> Consultation Room
                    </h1>
                    <p className="text-emerald-300 font-black text-sm uppercase tracking-[.3em]">View Lab Results & Patient Reports</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-blue-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <FileText className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-blue-600">{labRequests.length}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Requests</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">All lab requests you created</p>
                </div>

                <div className="bg-white border-2 border-orange-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center">
                            <Clock className="text-orange-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-orange-600">{readyCount}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ready for Review</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Results entered by lab/cashier</p>
                </div>

                <div className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                            <CheckCircle className="text-emerald-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-emerald-600">{completedCount}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Reviewed/Done</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Conclusion provided</p>
                </div>

            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by ticket or patient name..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lab Requests List */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> My Lab Requests ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Auto-refreshes every 10 seconds</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tests</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>

                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((req) => (
                                <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <span className="font-black text-emerald-600">{req.ticketNumber}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{req.patientName}</p>
                                        <p className="text-xs text-slate-400 font-bold">{req.age}y • {req.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            {req.requestedTests.hematology && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded">HEMA</span>}
                                            {req.requestedTests.biochemistry && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">BIO</span>}
                                            {req.requestedTests.serology && <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded">SERO</span>}
                                            {req.requestedTests.urinalysis && <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded">URINE</span>}
                                            {req.requestedTests.stoolExamination && <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded">STOOL</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${req.isPaid ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {req.isPaid ? 'PAID' : 'DUE'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            {req.status === 'Awaiting Doctor' && (
                                                <span className="animate-bounce bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">NEW</span>
                                            )}
                                            {req.status === 'Completed' || req.status === 'Reviewed' ? <CheckCircle size={16} className="text-emerald-600" /> : <Clock size={16} className="text-orange-600 animate-pulse" />}
                                            <span className={`px-3 py-1 rounded-full text-xs font-black ${['Completed', 'Reviewed'].includes(req.status) ? 'bg-emerald-100 text-emerald-600' :
                                                req.status === 'Awaiting Doctor' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-orange-100 text-orange-600'
                                                }`}>
                                                {req.status === 'Awaiting Doctor' ? 'Ready for Review' : req.status}
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
                                            {['Awaiting Doctor', 'Reviewed', 'Completed'].includes(req.status) ? (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRequest(req);
                                                            setDiagnosis(req.doctorConclusion || '');
                                                            setShowPrescriptionForm(true);
                                                        }}
                                                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-colors ${req.status === 'Awaiting Doctor'
                                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                                                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                            }`}
                                                    >
                                                        <FileText size={16} />
                                                        {req.status === 'Awaiting Doctor' ? 'Review & Conclude' : 'View Consultation'}
                                                    </button>

                                                    <button
                                                        onClick={() => handlePrintResults(req)}
                                                        className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                        title="Print"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-black text-xs uppercase flex items-center gap-2">
                                                    <Clock size={16} className="animate-pulse" /> Pending Lab
                                                </span>
                                            )}
                                        </div>
                                    </td>

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
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Lab Results</h3>
                                <p className="text-slate-600 font-bold">{selectedRequest.patientName} • {selectedRequest.ticketNumber}</p>
                            </div>
                            <button onClick={() => setShowResults(false)} className="px-6 py-3 bg-slate-100 rounded-2xl font-black uppercase hover:bg-slate-200">
                                Close
                            </button>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-2xl mb-6 border-2 border-blue-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Patient</p>
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
                            </div>
                        </div>

                        {/* RIGHT PANEL: Consultation & Prescription */}
                        <div className="flex-1 overflow-y-auto p-12 relative flex flex-col custom-scrollbar">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-4xl font-black text-slate-800 uppercase italic">Final Consultation</h3>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mt-2 tracking-[0.3em]">Patient: {selectedRequest.patientName} | Ticket: {selectedRequest.ticketNumber}</p>
                                </div>
                                <button onClick={() => setShowPrescriptionForm(false)} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-full transition-all hover:rotate-90">
                                    <Search className="rotate-45" size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] mb-4 px-2 group-focus-within:text-emerald-500 transition-colors">1. The Disease (Diagnosis)</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 font-bold text-xl text-slate-800 focus:border-emerald-500 focus:bg-white outline-none h-56 shadow-inner transition-all resize-none"
                                            placeholder="Write the final diagnosis/disease here..."
                                            value={diagnosis}
                                            onChange={e => setDiagnosis(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] mb-4 px-2 group-focus-within:text-blue-500 transition-colors">2. Physical Exam / Notes</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] p-8 font-bold text-slate-800 focus:border-blue-500 focus:bg-white outline-none h-44 shadow-inner transition-all resize-none"
                                            placeholder="Document any physical findings or extra notes..."
                                            value={physicalExam}
                                            onChange={e => setPhysicalExam(e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] mb-4 px-2 group-focus-within:text-emerald-500 transition-colors">3. Prescribe Medicines</label>
                                        <div className="relative">
                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                            <input
                                                type="text"
                                                className="w-full pl-16 pr-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-slate-800 focus:border-emerald-500 focus:bg-white outline-none shadow-sm transition-all"
                                                placeholder="Search pharmacy inventory..."
                                                value={medicineSearch}
                                                onChange={e => handleSearchMedicine(e.target.value)}
                                            />
                                        </div>

                                        {foundMedicines.length > 0 && (
                                            <div className="absolute z-[150] w-full mt-2 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden ring-4 ring-slate-100/50">
                                                {foundMedicines.map(med => (
                                                    <button
                                                        key={med._id}
                                                        onClick={() => addMedicine(med)}
                                                        className="w-full text-left px-8 py-6 hover:bg-emerald-50 border-b border-slate-50 last:border-none transition-all flex flex-col"
                                                    >
                                                        <p className="font-black text-slate-800 uppercase italic flex items-center gap-2 group">
                                                            <Beaker size={16} className="text-emerald-500 transition-transform group-hover:scale-125" /> {med.name}
                                                        </p>
                                                        <div className="flex justify-between items-center mt-2">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[.2em]">{med.category}</span>
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${med.totalUnitsInStock > 10 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                                In Stock: {med.totalUnitsInStock} {med.unitMeasure}
                                                            </span>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[.3em] px-2">Prescribed Items</label>
                                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                            {prescribedMedicines.length === 0 ? (
                                                <div className="p-16 border-4 border-dotted border-slate-100 rounded-[3rem] text-center bg-slate-50/50 flex flex-col items-center justify-center gap-4">
                                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200">
                                                        <Beaker size={32} />
                                                    </div>
                                                    <p className="text-slate-300 font-black uppercase text-[10px] italic tracking-widest">No medicines prescribed yet</p>
                                                </div>
                                            ) : prescribedMedicines.map((item, index) => (
                                                <div key={index} className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-100 relative group hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                                                    <div className="flex justify-between mb-5 items-start">
                                                        <p className="font-black text-slate-800 uppercase italic flex items-center gap-3">
                                                            <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xs shadow-sm">{index + 1}</span>
                                                            <span className="text-lg tracking-tight">{item.name}</span>
                                                        </p>
                                                        <button
                                                            onClick={() => setPrescribedMedicines(prescribedMedicines.filter((_, i) => i !== index))}
                                                            className="text-slate-200 hover:text-red-500 transition-colors p-2"
                                                        >
                                                            <Search className="rotate-45" size={20} />
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-5">
                                                        <div className="space-y-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Dosage</span>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 1x3"
                                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                                                value={item.dosage}
                                                                onChange={e => {
                                                                    const newMeds = [...prescribedMedicines];
                                                                    newMeds[index].dosage = e.target.value;
                                                                    setPrescribedMedicines(newMeds);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase px-1 tracking-widest">Duration</span>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 5 days"
                                                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                                                                value={item.duration}
                                                                onChange={e => {
                                                                    const newMeds = [...prescribedMedicines];
                                                                    newMeds[index].duration = e.target.value;
                                                                    setPrescribedMedicines(newMeds);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-10 border-t-2 border-slate-50 flex gap-6">
                                <button
                                    onClick={() => setShowPrescriptionForm(false)}
                                    className="px-12 bg-slate-100 text-slate-600 font-black py-6 rounded-[2.5rem] uppercase italic tracking-widest hover:bg-slate-200 transition-all border-b-4 border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSavePrescription}
                                    className="flex-1 bg-emerald-600 text-white font-black py-6 rounded-[2.5rem] uppercase italic tracking-[.2em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 text-2xl border-b-4 border-emerald-800"
                                >
                                    <CheckCircle size={36} className="drop-shadow-lg" /> Finalize Consultation
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultation;





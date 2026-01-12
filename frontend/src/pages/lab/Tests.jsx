import { useState, useEffect } from 'react';

import axios from 'axios';
import { Search, Filter, Printer, Edit, CheckCircle, Clock, FileText, X, FlaskConical } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const LabTests = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showResults, setShowResults] = useState(false);
    const [results, setResults] = useState({
        hematology: { hb: '', wbc: '', rbc: '', mcv: '', mch: '', platelets: '' },
        biochemistry: { bloodSugar: '', urea: '', creatinine: '', alt: '', ast: '', others: '' },
        serology: { hiv: '', hPylori: '', typhoid: '', hepatitis: '' },
        urinalysis: { color: '', protein: '', sugar: '', microscopy: '' },
        stoolExamination: { color: '', parasites: '', microscopy: '' }
    });

    useEffect(() => {
        const status = searchParams.get('status');
        if (status) {
            setStatusFilter(status);
        } else {
            setStatusFilter('All');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]);

    const fetchRequests = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };

            let url = 'https://lafoole.somsoftsystems.com/api/lab/requests?isPaid=true';
            if (statusFilter !== 'All') {
                url += `&status=${statusFilter}`;
            }

            const { data } = await axios.get(url, config);
            setRequests(data);
        } catch (err) { console.error(err); }
    };


    const handleEnterResults = (request) => {
        setSelectedRequest(request);
        setResults(request.results || {
            hematology: { hb: '', wbc: '', rbc: '', mcv: '', mch: '', platelets: '' },
            biochemistry: { bloodSugar: '', urea: '', creatinine: '', alt: '', ast: '', others: '' },
            serology: { hiv: '', hPylori: '', typhoid: '', hepatitis: '' },
            urinalysis: { color: '', protein: '', sugar: '', microscopy: '' },
            stoolExamination: { color: '', parasites: '', microscopy: '' }
        });
        setShowResults(true);
    };

    const handleSaveResults = async (silent = false) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/lab/requests/${selectedRequest._id}/results`, { results }, config);
            if (!silent) alert('Results saved successfully!');
            setShowResults(false);
            fetchRequests();
        } catch (err) {
            if (!silent) alert(err.response?.data?.message || 'Error saving results');
            throw err;
        }
    };


    const handleComplete = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/lab/requests/${id}/complete`, {}, config);
            alert('Patient returned to Doctor successfully!');
            fetchRequests();
        } catch (err) { alert(err.response?.data?.message || 'Error completing request'); }
    };


    const handlePrintTicket = (request) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        printWindow.document.write(`
            <html><head><title>Lab Ticket - ${request.ticketNumber}</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h2 { text-align: center; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .label { font-weight: bold; }
                .ticket-number { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
            </style></head><body>
            <h2>LABORATORY TICKET</h2>
            <div class="ticket-number">${request.ticketNumber}</div>
            <div class="info"><span class="label">Patient:</span> ${request.patientName}</div>
            <div class="info"><span class="label">Age/Sex:</span> ${request.age} years / ${request.sex}</div>
            <div class="info"><span class="label">Date:</span> ${new Date(request.createdAt).toLocaleDateString()}</div>
            <div class="info"><span class="label">Tests:</span></div>
            <ul>
                ${request.requestedTests.hematology ? '<li>Hematology</li>' : ''}
                ${request.requestedTests.biochemistry ? '<li>Biochemistry</li>' : ''}
                ${request.requestedTests.serology ? '<li>Serology</li>' : ''}
                ${request.requestedTests.urinalysis ? '<li>Urinalysis</li>' : ''}
                ${request.requestedTests.stoolExamination ? '<li>Stool Examination</li>' : ''}
            </ul>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handlePrintResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/lab/requests/${request._id}/print`, {}, config);

            const printWindow = window.open('', '', 'width=800,height=1000');
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
                    <h1>LABORATORY RESULTS</h1>
                    <p><strong>Ticket Number:</strong> ${request.ticketNumber}</p>
                </div>
                <div class="patient-info">
                    <p><strong>Patient Name:</strong> ${request.patientName}</p>
                    <p><strong>Age:</strong> ${request.age} years | <strong>Sex:</strong> ${request.sex}</p>
                    <p><strong>Date:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
                    <p><strong>Doctor:</strong> ${request.doctorName}</p>
                </div>
                ${request.requestedTests.hematology ? `
                <div class="section">
                    <div class="section-title">HEMATOLOGY</div>
                    <table>
                        <tr><td class="label">HB:</td><td>${request.results.hematology.hb || 'N/A'}</td></tr>
                        <tr><td class="label">WBC:</td><td>${request.results.hematology.wbc || 'N/A'}</td></tr>
                        <tr><td class="label">RBC:</td><td>${request.results.hematology.rbc || 'N/A'}</td></tr>
                        <tr><td class="label">MCV:</td><td>${request.results.hematology.mcv || 'N/A'}</td></tr>
                        <tr><td class="label">MCH:</td><td>${request.results.hematology.mch || 'N/A'}</td></tr>
                        <tr><td class="label">Platelets:</td><td>${request.results.hematology.platelets || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${request.requestedTests.biochemistry ? `
                <div class="section">
                    <div class="section-title">BIOCHEMISTRY</div>
                    <table>
                        <tr><td class="label">Blood Sugar:</td><td>${request.results.biochemistry.bloodSugar || 'N/A'}</td></tr>
                        <tr><td class="label">Urea:</td><td>${request.results.biochemistry.urea || 'N/A'}</td></tr>
                        <tr><td class="label">Creatinine:</td><td>${request.results.biochemistry.creatinine || 'N/A'}</td></tr>
                        <tr><td class="label">ALT:</td><td>${request.results.biochemistry.alt || 'N/A'}</td></tr>
                        <tr><td class="label">AST:</td><td>${request.results.biochemistry.ast || 'N/A'}</td></tr>
                        <tr><td class="label">Others:</td><td>${request.results.biochemistry.others || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${request.requestedTests.serology ? `
                <div class="section">
                    <div class="section-title">SEROLOGY</div>
                    <table>
                        <tr><td class="label">HIV:</td><td>${request.results.serology.hiv || 'N/A'}</td></tr>
                        <tr><td class="label">H. Pylori:</td><td>${request.results.serology.hPylori || 'N/A'}</td></tr>
                        <tr><td class="label">Typhoid:</td><td>${request.results.serology.typhoid || 'N/A'}</td></tr>
                        <tr><td class="label">Hepatitis:</td><td>${request.results.serology.hepatitis || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${request.requestedTests.urinalysis ? `
                <div class="section">
                    <div class="section-title">URINALYSIS</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${request.results.urinalysis.color || 'N/A'}</td></tr>
                        <tr><td class="label">Protein:</td><td>${request.results.urinalysis.protein || 'N/A'}</td></tr>
                        <tr><td class="label">Sugar:</td><td>${request.results.urinalysis.sugar || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${request.results.urinalysis.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${request.requestedTests.stoolExamination ? `
                <div class="section">
                    <div class="section-title">STOOL EXAMINATION</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${request.results.stoolExamination.color || 'N/A'}</td></tr>
                        <tr><td class="label">Parasites:</td><td>${request.results.stoolExamination.parasites || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${request.results.stoolExamination.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                <div class="signature">
                    <div class="sig-line">Processed By</div>
                    <div class="sig-line">Doctor Signature</div>
                </div>

                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
            fetchRequests();
        } catch (err) { alert(err.response?.data?.message || 'Error printing results'); }
    };

    const filtered = requests.filter(r =>
        r.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.patientName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-10 rounded-[3rem] shadow-2xl">
                <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                    <FlaskConical size={48} className="text-emerald-400" /> Consultation & Lab Requests
                </h1>
                <p className="text-slate-300 font-black text-sm uppercase tracking-[.3em]">Process Patient Results & Send to Doctor</p>
            </div>


            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by ticket or patient name..."
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 font-bold"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-500 font-bold appearance-none"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Requests</option>
                            <option value="Paid">Paid (Ready for Results)</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Awaiting Doctor">Awaiting Doctor Review</option>
                            <option value="Completed">Reviewed / Finalized</option>


                        </select>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Lab Requests ({filtered.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tests</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((req) => (
                                <tr key={req._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <span className="font-black text-purple-600">{req.ticketNumber}</span>
                                        <p className="text-xs text-slate-400 font-bold">{new Date(req.createdAt).toLocaleDateString()}</p>
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
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${req.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                            req.status === 'Reviewed' ? 'bg-emerald-50 text-emerald-500' :
                                                req.status === 'Awaiting Doctor' ? 'bg-blue-100 text-blue-600' :
                                                    req.status === 'In Progress' ? 'bg-purple-100 text-purple-600' :
                                                        'bg-orange-100 text-orange-600'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>

                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handlePrintTicket(req)}
                                                className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                title="Print Ticket"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            {['Pending', 'Paid', 'In Progress'].includes(req.status) && (
                                                <button
                                                    onClick={() => handleEnterResults(req)}
                                                    className="p-2 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                                    title="Enter Results"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {['In Progress', 'Paid', 'Awaiting Doctor'].includes(req.status) && (
                                                <button
                                                    onClick={() => handleComplete(req._id)}
                                                    className="p-2 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors flex items-center gap-2 px-3"
                                                    title="Send Result to Doctor"
                                                >
                                                    <CheckCircle size={18} />
                                                    <span className="text-[10px] font-black uppercase">Send to Doctor</span>
                                                </button>
                                            )}


                                            {['Awaiting Doctor', 'Reviewed', 'Completed'].includes(req.status) && (
                                                <button
                                                    onClick={() => handlePrintResults(req)}
                                                    className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                    title="Print Results"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                            )}

                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results Entry Modal */}
            {showResults && selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Enter Lab Results</h3>
                                <p className="text-slate-600 font-bold">{selectedRequest.patientName} • {selectedRequest.ticketNumber}</p>
                            </div>
                            <button onClick={() => setShowResults(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                            {/* Hematology */}
                            {selectedRequest.requestedTests.hematology && (
                                <div className="bg-blue-50 p-6 rounded-2xl border-2 border-blue-100">
                                    <h4 className="text-lg font-black text-blue-900 mb-4 uppercase">Hematology</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">HB</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.hb} onChange={e => setResults({ ...results, hematology: { ...results.hematology, hb: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">WBC</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.wbc} onChange={e => setResults({ ...results, hematology: { ...results.hematology, wbc: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">RBC</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.rbc} onChange={e => setResults({ ...results, hematology: { ...results.hematology, rbc: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">MCV</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.mcv} onChange={e => setResults({ ...results, hematology: { ...results.hematology, mcv: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">MCH</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.mch} onChange={e => setResults({ ...results, hematology: { ...results.hematology, mch: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Platelets</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.hematology.platelets} onChange={e => setResults({ ...results, hematology: { ...results.hematology, platelets: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Biochemistry */}
                            {selectedRequest.requestedTests.biochemistry && (
                                <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                                    <h4 className="text-lg font-black text-emerald-900 mb-4 uppercase">Biochemistry</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Blood Sugar</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.bloodSugar} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, bloodSugar: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Urea</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.urea} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, urea: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Creatinine</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.creatinine} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, creatinine: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">ALT</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.alt} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, alt: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">AST</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.ast} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, ast: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Others</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.biochemistry.others} onChange={e => setResults({ ...results, biochemistry: { ...results.biochemistry, others: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Serology */}
                            {selectedRequest.requestedTests.serology && (
                                <div className="bg-purple-50 p-6 rounded-2xl border-2 border-purple-100">
                                    <h4 className="text-lg font-black text-purple-900 mb-4 uppercase">Serology</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">HIV</label>
                                            <select className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.serology.hiv} onChange={e => setResults({ ...results, serology: { ...results.serology, hiv: e.target.value } })}>
                                                <option value="">Not Tested</option>
                                                <option value="Positive">Positive</option>
                                                <option value="Negative">Negative</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">H. Pylori</label>
                                            <select className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.serology.hPylori} onChange={e => setResults({ ...results, serology: { ...results.serology, hPylori: e.target.value } })}>
                                                <option value="">Not Tested</option>
                                                <option value="Positive">Positive</option>
                                                <option value="Negative">Negative</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Typhoid</label>
                                            <select className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.serology.typhoid} onChange={e => setResults({ ...results, serology: { ...results.serology, typhoid: e.target.value } })}>
                                                <option value="">Not Tested</option>
                                                <option value="Positive">Positive</option>
                                                <option value="Negative">Negative</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Hepatitis</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.serology.hepatitis} onChange={e => setResults({ ...results, serology: { ...results.serology, hepatitis: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Urinalysis */}
                            {selectedRequest.requestedTests.urinalysis && (
                                <div className="bg-orange-50 p-6 rounded-2xl border-2 border-orange-100">
                                    <h4 className="text-lg font-black text-orange-900 mb-4 uppercase">Urinalysis</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Color</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.urinalysis.color} onChange={e => setResults({ ...results, urinalysis: { ...results.urinalysis, color: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Protein</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.urinalysis.protein} onChange={e => setResults({ ...results, urinalysis: { ...results.urinalysis, protein: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Sugar</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.urinalysis.sugar} onChange={e => setResults({ ...results, urinalysis: { ...results.urinalysis, sugar: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Microscopy</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.urinalysis.microscopy} onChange={e => setResults({ ...results, urinalysis: { ...results.urinalysis, microscopy: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stool Examination */}
                            {selectedRequest.requestedTests.stoolExamination && (
                                <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-100">
                                    <h4 className="text-lg font-black text-red-900 mb-4 uppercase">Stool Examination</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Color</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.stoolExamination.color} onChange={e => setResults({ ...results, stoolExamination: { ...results.stoolExamination, color: e.target.value } })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase">Parasites</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.stoolExamination.parasites} onChange={e => setResults({ ...results, stoolExamination: { ...results.stoolExamination, parasites: e.target.value } })} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-black text-slate-400 uppercase">Microscopy</label>
                                            <input type="text" className="w-full bg-white border-none rounded-xl p-3 font-bold" value={results.stoolExamination.microscopy} onChange={e => setResults({ ...results, stoolExamination: { ...results.stoolExamination, microscopy: e.target.value } })} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowResults(false)}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveResults}
                                className="flex-1 bg-slate-200 text-slate-700 font-black py-4 rounded-2xl uppercase"
                            >
                                Save Only
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await handleSaveResults(true);
                                        await handleComplete(selectedRequest._id);
                                        alert('Results sent to Doctor successfully!');
                                    } catch (err) { /* handled in functions */ }
                                }}
                                className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3"
                            >
                                <CheckCircle size={24} /> Save & Send to Doctor
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default LabTests;

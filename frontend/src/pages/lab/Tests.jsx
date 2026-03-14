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
    const [resultText, setResultText] = useState('');

    const emptyResults = {
        hematology: { hb: '', wbc: '', rbc: '', mcv: '', mch: '', platelets: '' },
        biochemistry: { bloodSugar: '', urea: '', creatinine: '', alt: '', ast: '', others: '' },
        serology: { hiv: '', hPylori: '', typhoid: '', hepatitis: '' },
        urinalysis: { color: '', protein: '', sugar: '', microscopy: '' },
        stoolExamination: { color: '', parasites: '', microscopy: '' }
    };

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

            let url = '/api/lab/requests?isPaid=true';
            if (statusFilter !== 'All') {
                url += `&status=${statusFilter}`;
            }

            const { data } = await axios.get(url, config);
            setRequests(data);
        } catch (err) { console.error(err); }
    };


    const handleEnterResults = (request) => {
        setSelectedRequest(request);
        setResults(request.results || emptyResults);
        setResultText(request.resultText || '');
        setShowResults(true);
    };

    const handleSaveResults = async (silent = false) => {
        if (!resultText.trim()) {
            if (!silent) alert('Fadlan geli natiijada shaybaarka sanduuqa qoraalka.');
            throw new Error('Qoraalka natiijada waa qasab');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`/api/lab/requests/${selectedRequest._id}/results`, { results, resultText: resultText.trim() }, config);
            if (!silent) alert('Natiijooyinka si guul leh ayaa loo keydiyey.');
            setShowResults(false);
            fetchRequests();
        } catch (err) {
            if (!silent) alert(err.response?.data?.message || 'Qalad ayaa ka dhacay keydinta natiijooyinka.');
            throw err;
        }
    };


    const handleComplete = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`/api/lab/requests/${id}/complete`, {}, config);
            alert('Bukaanka si guul leh ayaa loogu celiyey dhakhtarka.');
            fetchRequests();
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay dhammaystirka codsiga.'); }
    };


    const handlePrintTicket = (request) => {
        const printWindow = window.open('', '', 'width=400,height=600');
        printWindow.document.write(`
                <html><head><title>Tigidhka Shaybaarka - ${request.ticketNumber}</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                h2 { text-align: center; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .label { font-weight: bold; }
                .ticket-number { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
            </style></head><body>
            <h2>TIGIDHKA SHAYBAARKA</h2>
            <div class="ticket-number">${request.ticketNumber}</div>
            <div class="info"><span class="label">Bukaan:</span> ${request.patientName}</div>
            <div class="info"><span class="label">Da'/Jinsi:</span> ${request.age} sano / ${request.sex}</div>
            <div class="info"><span class="label">Taariikh:</span> ${new Date(request.createdAt).toLocaleDateString()}</div>
            <div class="info"><span class="label">Baaritaanno:</span></div>
            <ul>
                ${request.requestedTestInput ? `<li>${request.requestedTestInput}</li>` : ''}
                ${!request.requestedTestInput && request.requestedTests.hematology ? '<li>Dhiig</li>' : ''}
                ${!request.requestedTestInput && request.requestedTests.biochemistry ? '<li>Kiimiko</li>' : ''}
                ${!request.requestedTestInput && request.requestedTests.serology ? '<li>Serology</li>' : ''}
                ${!request.requestedTestInput && request.requestedTests.urinalysis ? '<li>Kaadi</li>' : ''}
                ${!request.requestedTestInput && request.requestedTests.stoolExamination ? '<li>Baaritaanka Saxarada</li>' : ''}
            </ul>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handlePrintResults = async (request) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`/api/lab/requests/${request._id}/print`, {}, config);

            const printWindow = window.open('', '', 'width=800,height=1000');
            printWindow.document.write(`
                <html><head><title>Natiijooyinka Shaybaarka - ${request.ticketNumber}</title>
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
                    <h1>NATIIJOYINKA SHAYBAARKA</h1>
                    <p><strong>Lambarka Tigidhka:</strong> ${request.ticketNumber}</p>
                </div>
                <div class="patient-info">
                    <p><strong>Magaca Bukaanka:</strong> ${request.patientName}</p>
                    <p><strong>Da'da:</strong> ${request.age} sano | <strong>Jinsiga:</strong> ${request.sex}</p>
                    <p><strong>Taariikh:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
                    <p><strong>Dhakhtar:</strong> ${request.doctorName}</p>
                    ${request.requestedTestInput ? `<p><strong>Baaritaanka La Codsaday:</strong> ${request.requestedTestInput}</p>` : ''}
                </div>
                ${request.resultText ? `
                <div class="section">
                    <div class="section-title">NATIIJO</div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;white-space:pre-wrap;">${request.resultText}</div>
                </div>` : ''}
                ${!request.resultText && request.requestedTests.hematology ? `
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
                ${!request.resultText && request.requestedTests.biochemistry ? `
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
                ${!request.resultText && request.requestedTests.serology ? `
                <div class="section">
                    <div class="section-title">SEROLOGY</div>
                    <table>
                        <tr><td class="label">HIV:</td><td>${request.results.serology.hiv || 'N/A'}</td></tr>
                        <tr><td class="label">H. Pylori:</td><td>${request.results.serology.hPylori || 'N/A'}</td></tr>
                        <tr><td class="label">Typhoid:</td><td>${request.results.serology.typhoid || 'N/A'}</td></tr>
                        <tr><td class="label">Hepatitis:</td><td>${request.results.serology.hepatitis || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${!request.resultText && request.requestedTests.urinalysis ? `
                <div class="section">
                    <div class="section-title">URINALYSIS</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${request.results.urinalysis.color || 'N/A'}</td></tr>
                        <tr><td class="label">Protein:</td><td>${request.results.urinalysis.protein || 'N/A'}</td></tr>
                        <tr><td class="label">Sugar:</td><td>${request.results.urinalysis.sugar || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${request.results.urinalysis.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                ${!request.resultText && request.requestedTests.stoolExamination ? `
                <div class="section">
                    <div class="section-title">STOOL EXAMINATION</div>
                    <table>
                        <tr><td class="label">Color:</td><td>${request.results.stoolExamination.color || 'N/A'}</td></tr>
                        <tr><td class="label">Parasites:</td><td>${request.results.stoolExamination.parasites || 'N/A'}</td></tr>
                        <tr><td class="label">Microscopy:</td><td>${request.results.stoolExamination.microscopy || 'N/A'}</td></tr>
                    </table>
                </div>` : ''}
                <div class="signature">
                    <div class="sig-line">Waxaa Maamulay</div>
                    <div class="sig-line">Saxiixa Dhakhtarka</div>
                </div>

                </body></html>
            `);
            printWindow.document.close();
            printWindow.print();
            fetchRequests();
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay daabacaadda natiijooyinka.'); }
    };

    const filtered = requests.filter(r =>
        r.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        r.patientName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <FlaskConical size={30} className="text-primary" /> La-talin iyo Codsiyada Shaybaarka
                </h1>
                <p className="section-subtitle">Maamul natiijooyinka bukaanka oo u dir warbixinnada la dhammeeyey dhakhtarka.</p>
            </div>


            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div className="card">
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <select
                            className="w-full pl-12 appearance-none"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Dhammaan Codsiyada</option>
                            <option value="Paid">La Bixiyey (Natiijo Diyaar U Ah)</option>
                            <option value="In Progress">Socda</option>
                            <option value="Awaiting Doctor">Dib-u-eegis Dhakhtar Sugaya</option>
                            <option value="Completed">La Eegay / La Dhammeeyey</option>


                        </select>
                    </div>
                </div>
            </div>

            {/* Requests List */}
            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Codsiyada Shaybaarka ({filtered.length})
                    </h3>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Tigidh</th>
                                <th>Bukaan</th>
                                <th>Baaritaanno</th>
                                <th>Xaalad</th>
                                <th>Falal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((req) => (
                                <tr key={req._id}>
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
                                                title="Daabac Tigidhka"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            {['Pending', 'Paid', 'In Progress'].includes(req.status) && (
                                                <button
                                                    onClick={() => handleEnterResults(req)}
                                                    className="p-2 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                                    title="Geli Natiijooyinka"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {['In Progress', 'Paid', 'Awaiting Doctor'].includes(req.status) && (
                                                <button
                                                    onClick={() => handleComplete(req._id)}
                                                    className="p-2 rounded-xl bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors flex items-center gap-2 px-3"
                                                    title="U Dir Natiijada Dhakhtarka"
                                                >
                                                    <CheckCircle size={18} />
                                                    <span className="text-[10px] font-black uppercase">U Dir Dhakhtarka</span>
                                                </button>
                                            )}


                                            {['Awaiting Doctor', 'Reviewed', 'Completed'].includes(req.status) && (
                                                <button
                                                    onClick={() => handlePrintResults(req)}
                                                    className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                    title="Daabac Natiijooyinka"
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
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Geli Natiijooyinka Shaybaarka</h3>
                                <p className="text-slate-600 font-bold">{selectedRequest.patientName} • {selectedRequest.ticketNumber}</p>
                            </div>
                            <button onClick={() => setShowResults(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                            <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-100">
                                <h4 className="text-lg font-black text-emerald-900 mb-4 uppercase">Geli Natiijada Hal Goob</h4>
                                <div className="mb-4 rounded-2xl bg-white p-4 border border-emerald-100">
                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Baaritaanka La Codsaday</p>
                                    <p className="font-bold text-slate-800 whitespace-pre-wrap">
                                        {selectedRequest.requestedTestInput || 'Baaritaan qoran lama bixin'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase">Natiijada Shaybaarka</label>
                                    <textarea
                                        className="w-full min-h-[220px] bg-white border-none rounded-2xl p-4 font-bold text-slate-800"
                                        placeholder="Halkan ku qor natiijada shaybaarka oo dhan hal meel."
                                        value={resultText}
                                        onChange={(e) => setResultText(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowResults(false)}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Jooji
                            </button>
                            <button
                                onClick={handleSaveResults}
                                className="flex-1 bg-slate-200 text-slate-700 font-black py-4 rounded-2xl uppercase"
                            >
                                Keydi Keliya
                            </button>
                            <button
                                onClick={async () => {
                                    try {
                                        await handleSaveResults(true);
                                        await handleComplete(selectedRequest._id);
                                        alert('Natiijooyinka si guul leh ayaa loogu diray dhakhtarka.');
                                    } catch (err) { /* handled in functions */ }
                                }}
                                className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3"
                            >
                                <CheckCircle size={24} /> Keydi oo U Dir Dhakhtarka
                            </button>

                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default LabTests;



import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, FlaskConical, Search, Plus, CheckCircle, Clock, FileText, AlertCircle, Eye } from 'lucide-react';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [patients, setPatients] = useState([]);
    const [labRequestsAwaiting, setLabRequestsAwaiting] = useState([]);
    const [search, setSearch] = useState('');
    const [showLabRequest, setShowLabRequest] = useState(null);
    const [requestedTests, setRequestedTests] = useState({
        hematology: false,
        biochemistry: false,
        serology: false,
        urinalysis: false,
        stoolExamination: false
    });

    useEffect(() => {
        fetchDashboard();
        fetchPatients();
        fetchLabRequestsAwaiting();
        // Auto-refresh every 10 seconds
        const interval = setInterval(() => {
            fetchLabRequestsAwaiting();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboard = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/doctor/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
    };

    const fetchPatients = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/doctor/patients', config);
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const fetchLabRequestsAwaiting = async () => {
        try {
            const userStr = localStorage.getItem('clinic_user');
            if (!userStr) return;
            const userObj = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userObj.token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/doctor/lab-reviews', config);
            setLabRequestsAwaiting(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const handleCreateLabRequest = async () => {
        if (!Object.values(requestedTests).some(v => v)) {
            return alert('Please select at least one test');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://homecare.nidwa.com/api/lab/requests', {
                patient: showLabRequest._id,
                patientId: showLabRequest.patientId,
                patientName: showLabRequest.name,
                age: showLabRequest.age,
                sex: showLabRequest.sex,
                requestedTests
            }, config);

            setShowLabRequest(null);
            setRequestedTests({ hematology: false, biochemistry: false, serology: false, urinalysis: false, stoolExamination: false });
            alert('Lab request created successfully!');
            fetchDashboard();
        } catch (err) { alert(err.response?.data?.message || 'Error creating lab request'); }
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <FlaskConical size={30} className="text-primary" /> Doctor Dashboard
                </h1>
                <p className="section-subtitle">Patient management and laboratory follow-up for your consultations.</p>
            </div>

            <div className="metrics-grid md:grid-cols-5">
                <div className="metric-card border-l-4 border-blue-500">
                    <p className="metric-label">In Queue</p>
                    <h3 className="metric-value">{patients.filter(p => p.visitStatus === 'Waiting for Doctor').length}</h3>
                </div>

                <div className="metric-card border-l-4 border-primary">
                    <p className="metric-label">Today's Patients</p>
                    <h3 className="metric-value">{stats?.todayPatients || 0}</h3>
                </div>

                <div className="metric-card border-l-4 border-sky-500">
                    <p className="metric-label">My Lab Requests</p>
                    <h3 className="metric-value">{stats?.myLabRequests || 0}</h3>
                </div>

                <div className="metric-card border-l-4 border-amber-500">
                    <p className="metric-label">Active Consults</p>
                    <h3 className="metric-value">{patients.filter(p => p.visitStatus === 'In Consultation').length}</h3>
                </div>

                <button
                    onClick={() => navigate('/doctor/consult')}
                    className={`metric-card border-l-4 border-red-500 text-left transition-colors hover:bg-red-50 ${labRequestsAwaiting.length > 0 ? 'ring-2 ring-red-200' : ''}`}
                >
                    <p className="metric-label text-red-600">Awaiting Review</p>
                    <h3 className="metric-value text-red-700">{labRequestsAwaiting.length}</h3>
                    <p className="metric-hint">Click to review results</p>
                </button>
            </div>


            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search patients..."
                        className="w-full pl-12"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Patient List */}
            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <Users /> Patients ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Click a row to start consultation and lab request</p>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Patient ID</th>
                                <th>Name</th>
                                <th>Age and Sex</th>
                                <th>Contact</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((patient) => (
                                <tr key={patient._id}>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-blue-600 text-sm">{patient.patientId}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{patient.name}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-600">{patient.age} years • {patient.sex}</p>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${patient.visitStatus === 'Waiting for Doctor' ? 'bg-blue-100 text-blue-600' :
                                            patient.visitStatus === 'In Consultation' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {patient.visitStatus}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-600">{patient.phone || 'N/A'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={async () => {
                                                const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
                                                await axios.patch(`https://homecare.nidwa.com/api/doctor/patients/${patient._id}/status`, { visitStatus: 'In Consultation' }, config);
                                                setShowLabRequest(patient);
                                                fetchPatients();
                                            }}
                                            className="btn-primary text-xs uppercase tracking-wide"
                                        >
                                            <Plus size={16} /> Start Consultation
                                        </button>
                                    </td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                </div>
            </div>

            {/* Lab Request Modal */}
            {showLabRequest && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl">
                        <h3 className="text-3xl font-black text-slate-800 mb-2 uppercase italic">Create Lab Request</h3>
                        <div className="bg-blue-50 p-4 rounded-2xl mb-6 border-2 border-blue-100">
                            <p className="font-black text-blue-900">Patient: {showLabRequest.name}</p>
                            <p className="text-sm font-bold text-blue-600">{showLabRequest.age} years • {showLabRequest.sex} • {showLabRequest.patientId}</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Select Tests to Request:</p>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded"
                                    checked={requestedTests.hematology}
                                    onChange={e => setRequestedTests({ ...requestedTests, hematology: e.target.checked })}
                                />
                                <div>
                                    <p className="font-black text-slate-800">Hematology</p>
                                    <p className="text-xs text-slate-500 font-bold">HB, WBC, RBC, MCV, MCH, Platelets</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded"
                                    checked={requestedTests.biochemistry}
                                    onChange={e => setRequestedTests({ ...requestedTests, biochemistry: e.target.checked })}
                                />
                                <div>
                                    <p className="font-black text-slate-800">Biochemistry</p>
                                    <p className="text-xs text-slate-500 font-bold">Blood Sugar, Urea, Creatinine, ALT, AST</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded"
                                    checked={requestedTests.serology}
                                    onChange={e => setRequestedTests({ ...requestedTests, serology: e.target.checked })}
                                />
                                <div>
                                    <p className="font-black text-slate-800">Serology</p>
                                    <p className="text-xs text-slate-500 font-bold">HIV, H. Pylori, Typhoid, Hepatitis</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded"
                                    checked={requestedTests.urinalysis}
                                    onChange={e => setRequestedTests({ ...requestedTests, urinalysis: e.target.checked })}
                                />
                                <div>
                                    <p className="font-black text-slate-800">Urinalysis</p>
                                    <p className="text-xs text-slate-500 font-bold">Color, Protein, Sugar, Microscopy</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded"
                                    checked={requestedTests.stoolExamination}
                                    onChange={e => setRequestedTests({ ...requestedTests, stoolExamination: e.target.checked })}
                                />
                                <div>
                                    <p className="font-black text-slate-800">Stool Examination</p>
                                    <p className="text-xs text-slate-500 font-bold">Color, Parasites, Microscopy</p>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowLabRequest(null)}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateLabRequest}
                                className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                            >
                                <FileText size={20} /> Create Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;


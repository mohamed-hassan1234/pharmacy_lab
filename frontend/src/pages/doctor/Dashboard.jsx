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
            const { data } = await axios.get('http://https://lafoole.somsoftsystems.com/api/doctor/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
    };

    const fetchPatients = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://https://lafoole.somsoftsystems.com/api/doctor/patients', config);
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const fetchLabRequestsAwaiting = async () => {
        try {
            const userStr = localStorage.getItem('clinic_user');
            if (!userStr) return;
            const userObj = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userObj.token}` } };
            const { data } = await axios.get('http://https://lafoole.somsoftsystems.com/api/lab/requests', config);
            // Filter for this doctor's requests with "Awaiting Doctor" status
            const awaiting = data.filter(req => req.doctorId?._id === userObj.user?._id && req.status === 'Awaiting Doctor');
            setLabRequestsAwaiting(awaiting);
        } catch (err) { console.error(err); }
    };

    const handleCreateLabRequest = async () => {
        if (!Object.values(requestedTests).some(v => v)) {
            return alert('Please select at least one test');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('http://https://lafoole.somsoftsystems.com/api/lab/requests', {
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
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                        <FlaskConical size={48} className="text-emerald-400" /> Doctor Dashboard
                    </h1>
                    <p className="text-emerald-300 font-black text-sm uppercase tracking-[.3em]">Patient Management & Lab Requests</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <Users className="mb-4" size={40} />
                    <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">In Queue</p>
                    <h3 className="text-5xl font-black tracking-tighter">{patients.filter(p => p.visitStatus === 'Waiting for Doctor').length}</h3>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <CheckCircle className="mb-4" size={40} />
                    <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-2">Today's Patients</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.todayPatients || 0}</h3>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <FlaskConical className="mb-4" size={40} />
                    <p className="text-xs font-black text-purple-200 uppercase tracking-widest mb-2">My Lab Requests</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.myLabRequests || 0}</h3>
                </div>

                <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <Clock className="mb-4" size={40} />
                    <p className="text-xs font-black text-orange-200 uppercase tracking-widest mb-2">Active Consults</p>
                    <h3 className="text-5xl font-black tracking-tighter">{patients.filter(p => p.visitStatus === 'In Consultation').length}</h3>
                </div>

                {/* NEW: Awaiting Doctor Review Card - CLICKABLE */}
                <button
                    onClick={() => navigate('/doctor/consult')}
                    className={`bg-gradient-to-br from-red-600 to-red-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-all text-left relative overflow-hidden ${labRequestsAwaiting.length > 0 ? 'animate-pulse ring-4 ring-red-400' : ''}`}
                >
                    {labRequestsAwaiting.length > 0 && (
                        <div className="absolute top-2 right-2">
                            <span className="flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                            </span>
                        </div>
                    )}
                    <AlertCircle className="mb-4" size={40} />
                    <p className="text-xs font-black text-red-200 uppercase tracking-widest mb-2">Awaiting Review</p>
                    <h3 className="text-5xl font-black tracking-tighter">{labRequestsAwaiting.length}</h3>
                    <p className="text-xs font-bold text-red-100 mt-2 uppercase">Click to Review →</p>
                </button>
            </div>


            {/* Search */}
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search patients..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Patient List */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <Users /> Patients ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Click to create lab request</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient ID</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Age & Sex</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((patient) => (
                                <tr key={patient._id} className="hover:bg-slate-50/50 transition-colors">
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
                                                await axios.patch(`http://https://lafoole.somsoftsystems.com/api/doctor/patients/${patient._id}/status`, { visitStatus: 'In Consultation' }, config);
                                                setShowLabRequest(patient);
                                                fetchPatients();
                                            }}
                                            className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl font-black text-xs uppercase hover:bg-emerald-200 transition-colors flex items-center gap-2"
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

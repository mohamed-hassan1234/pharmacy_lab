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
    const [requestedTestInput, setRequestedTestInput] = useState('');

    const parseRequestedTests = (input) => {
        const text = String(input || '').toLowerCase();
        return {
            hematology: /(hematology|hb|wbc|rbc|mcv|mch|platelet|cbc|fbc)/i.test(text),
            biochemistry: /(biochemistry|blood sugar|glucose|urea|creatinine|alt|ast)/i.test(text),
            serology: /(serology|hiv|h[\.\s-]*pylori|typhoid|hepatitis)/i.test(text),
            urinalysis: /(urinalysis|urine|urine protein|urine sugar|microscopy)/i.test(text),
            stoolExamination: /(stool|parasite|ova)/i.test(text)
        };
    };

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
            const { data } = await axios.get('http://localhost:5010/api/doctor/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
    };

    const fetchPatients = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/doctor/patients', config);
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const fetchLabRequestsAwaiting = async () => {
        try {
            const userStr = localStorage.getItem('clinic_user');
            if (!userStr) return;
            const userObj = JSON.parse(userStr);
            const config = { headers: { Authorization: `Bearer ${userObj.token}` } };
            const { data } = await axios.get('http://localhost:5010/api/doctor/lab-reviews', config);
            setLabRequestsAwaiting(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const handleCreateLabRequest = async () => {
        const requestedTests = parseRequestedTests(requestedTestInput);
        if (!Object.values(requestedTests).some(v => v)) {
            return alert('Fadlan qor ugu yaraan hal magac baaritaan oo la taageerayo, tusaale ahaan: HB, WBC, blood sugar, HIV, urine, stool.');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('http://localhost:5010/api/lab/requests', {
                patient: showLabRequest._id,
                patientId: showLabRequest.patientId,
                patientName: showLabRequest.name,
                age: showLabRequest.age,
                sex: showLabRequest.sex,
                requestedTests,
                requestedTestInput: requestedTestInput.trim()
            }, config);

            setShowLabRequest(null);
            setRequestedTestInput('');
            alert('Codsiga shaybaarka si guul leh ayaa loo sameeyey.');
            fetchDashboard();
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay samaynta codsiga shaybaarka.'); }
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <FlaskConical size={30} className="text-primary" /> Gudiga Dhakhtarka
                </h1>
                <p className="section-subtitle">Maamulka bukaanka iyo la socodka shaybaarka ee la-tashiyadaada.</p>
            </div>

            <div className="metrics-grid md:grid-cols-5">
                <div className="metric-card border-l-4 border-blue-500">
                    <p className="metric-label">Safka Ku Jira</p>
                    <h3 className="metric-value">{patients.filter(p => p.visitStatus === 'Waiting for Doctor').length}</h3>
                </div>

                <div className="metric-card border-l-4 border-primary">
                    <p className="metric-label">Bukaannada Maanta</p>
                    <h3 className="metric-value">{stats?.todayPatients || 0}</h3>
                </div>

                <div className="metric-card border-l-4 border-sky-500">
                    <p className="metric-label">Codsiyadayda Shaybaarka</p>
                    <h3 className="metric-value">{stats?.myLabRequests || 0}</h3>
                </div>

                <div className="metric-card border-l-4 border-amber-500">
                    <p className="metric-label">La-talinnada Socda</p>
                    <h3 className="metric-value">{patients.filter(p => p.visitStatus === 'In Consultation').length}</h3>
                </div>

                <button
                    onClick={() => navigate('/doctor/consult')}
                    className={`metric-card border-l-4 border-red-500 text-left transition-colors hover:bg-red-50 ${labRequestsAwaiting.length > 0 ? 'ring-2 ring-red-200' : ''}`}
                >
                    <p className="metric-label text-red-600">Dib-u-eegis Sugaya</p>
                    <h3 className="metric-value text-red-700">{labRequestsAwaiting.length}</h3>
                    <p className="metric-hint">Guji si aad u eegto natiijooyinka</p>
                </button>
            </div>


            {/* Search */}
            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Raadi bukaanno..."
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
                        <Users /> Bukaanno ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Guji saf si aad u bilowdo la-talin iyo codsi shaybaar</p>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Aqoonsiga Bukaanka</th>
                                <th>Magaca</th>
                                <th>Da'da iyo Jinsiga</th>
                                <th>Xiriir</th>
                                <th>Fal</th>
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
                                        <p className="font-bold text-slate-600">{patient.age} sano • {patient.sex}</p>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${patient.visitStatus === 'Waiting for Doctor' ? 'bg-blue-100 text-blue-600' :
                                            patient.visitStatus === 'In Consultation' ? 'bg-emerald-100 text-emerald-600' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {patient.visitStatus}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-600">{patient.phone || 'Ma jiro'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={async () => {
                                                const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
                                                await axios.patch(`http://localhost:5010/api/doctor/patients/${patient._id}/status`, { visitStatus: 'In Consultation' }, config);
                                                setRequestedTestInput('');
                                                setShowLabRequest(patient);
                                                fetchPatients();
                                            }}
                                            className="btn-primary text-xs uppercase tracking-wide"
                                        >
                                            <Plus size={16} /> Bilow La-talin
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
                        <h3 className="text-3xl font-black text-slate-800 mb-2 uppercase italic">Samee Codsi Shaybaar</h3>
                        <div className="bg-blue-50 p-4 rounded-2xl mb-6 border-2 border-blue-100">
                            <p className="font-black text-blue-900">Bukaan: {showLabRequest.name}</p>
                            <p className="text-sm font-bold text-blue-600">{showLabRequest.age} sano • {showLabRequest.sex} • {showLabRequest.patientId}</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Qor Baaritaannada La Codsanayo:</p>
                            <textarea
                                className="w-full min-h-[180px] rounded-[2rem] border-2 border-slate-100 bg-slate-50 p-6 font-bold text-slate-800 outline-none focus:border-blue-300 focus:bg-white"
                                placeholder="Halkan ku qor baaritaannada. Tusaale: HB, WBC, blood sugar, creatinine, HIV, urine protein..."
                                value={requestedTestInput}
                                onChange={(e) => setRequestedTestInput(e.target.value)}
                            />
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-black uppercase tracking-widest text-blue-700 mb-2">Erayada baaritaanka la taageerayo</p>
                                <p className="text-sm font-bold text-blue-900">
                                    Hematology: HB, WBC, RBC, MCV, MCH, Platelets
                                </p>
                                <p className="text-sm font-bold text-blue-900">
                                    Biochemistry: Blood Sugar, Urea, Creatinine, ALT, AST
                                </p>
                                <p className="text-sm font-bold text-blue-900">
                                    Serology: HIV, H. pylori, Typhoid, Hepatitis
                                </p>
                                <p className="text-sm font-bold text-blue-900">
                                    Urinalysis: Urine, Urine Protein, Urine Sugar, Microscopy
                                </p>
                                <p className="text-sm font-bold text-blue-900">
                                    Stool: Stool, Parasites
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => {
                                    setShowLabRequest(null);
                                    setRequestedTestInput('');
                                }}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Jooji
                            </button>
                            <button
                                onClick={handleCreateLabRequest}
                                className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                            >
                                <FileText size={20} /> Samee Codsi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;



import { useState, useEffect } from 'react';
import axios from 'axios';
import { FlaskConical, Clock, CheckCircle, FileText, Calendar, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LabDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/lab/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <FlaskConical size={30} className="text-primary" /> Laboratory Dashboard
                </h1>
                <p className="section-subtitle">Monitor test flow, turnaround, and result handover to doctors.</p>
            </div>

            <div className="metrics-grid">
                <div className="metric-card border-l-4 border-blue-500">
                    <p className="metric-label">Total Requests</p>
                    <h3 className="metric-value">{stats?.totalRequests || 0}</h3>
                </div>

                <button
                    className="metric-card border-l-4 border-amber-500 text-left"
                    onClick={() => navigate('/lab/tests?status=Pending')}
                >
                    <p className="metric-label text-amber-700">Pending Tests</p>
                    <h3 className="metric-value text-amber-700">{stats?.pendingRequests || 0}</h3>
                </button>

                <div className="metric-card border-l-4 border-sky-500">
                    <p className="metric-label">In Progress</p>
                    <h3 className="metric-value">{stats?.inProgressRequests || 0}</h3>
                </div>

                <button
                    className="metric-card border-l-4 border-primary text-left"
                    onClick={() => navigate('/lab/tests?status=Completed')}
                >
                    <p className="metric-label text-primary-dark">Completed</p>
                    <h3 className="metric-value text-primary-dark">{stats?.completedRequests || 0}</h3>
                </button>
            </div>

            {/* Today & Month Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card border-l-4 border-blue-500">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Calendar className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-blue-600">{stats?.todayRequests || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Today's Tests</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Lab requests received today</p>
                </div>

                <div className="card border-l-4 border-primary">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-primary-light rounded-xl flex items-center justify-center">
                            <FileText className="text-primary-dark" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-primary-dark">{stats?.monthRequests || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">This Month</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Total tests this month</p>
                </div>
            </div>

            {/* Recent Requests */}
            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Recent Lab Requests
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase">Last 10 requests</p>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Ticket #</th>
                                <th>Patient</th>
                                <th>Doctor</th>
                                <th>Tests</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentRequests?.map((req) => (
                                <tr key={req._id} className="cursor-pointer"
                                    onClick={() => navigate(`/lab/tests/${req._id}`)}>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-purple-600 text-sm">{req.ticketNumber}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{req.patientName}</p>
                                        <p className="text-xs text-slate-400 font-bold">{req.age}y • {req.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-600">{req.doctorId?.name || req.doctorName}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            {req.requestedTests.hematology && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded uppercase">Hematology</span>}
                                            {req.requestedTests.biochemistry && <span className="text-[9px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded uppercase">Biochem</span>}
                                            {req.requestedTests.serology && <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded uppercase">Serology</span>}
                                            {req.requestedTests.urinalysis && <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded uppercase">Urine</span>}
                                            {req.requestedTests.stoolExamination && <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase">Stool</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${req.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                                req.status === 'In Progress' ? 'bg-purple-100 text-purple-600' :
                                                    'bg-orange-100 text-orange-600'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-400">{new Date(req.createdAt).toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => navigate('/lab/patients')}
                    className="card border-l-4 border-blue-500 text-left transition-transform hover:-translate-y-0.5"
                >
                    <FileText className="mb-3 text-blue-600" size={32} />
                    <h4 className="text-lg font-bold">Register Patient</h4>
                    <p className="text-sm text-slate-500 mt-1">Add a new patient for lab tests.</p>
                </button>

                <button
                    onClick={() => navigate('/lab/tests?status=Pending')}
                    className="card border-l-4 border-amber-500 text-left transition-transform hover:-translate-y-0.5"
                >
                    <Clock className="mb-3 text-amber-600" size={32} />
                    <h4 className="text-lg font-bold">Pending Tests</h4>
                    <p className="text-sm text-slate-500 mt-1">View and process pending requests.</p>
                </button>

                <button
                    onClick={() => navigate('/lab/tests?status=Completed')}
                    className="card border-l-4 border-primary text-left transition-transform hover:-translate-y-0.5"
                >
                    <CheckCircle className="mb-3 text-primary" size={32} />
                    <h4 className="text-lg font-bold">Completed Results</h4>
                    <p className="text-sm text-slate-500 mt-1">Open finalized test results.</p>
                </button>
            </div>
        </div>
    );
};

export default LabDashboard;


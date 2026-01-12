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
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/lab/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-purple-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                        <FlaskConical size={48} className="text-purple-400" /> Laboratory Dashboard
                    </h1>
                    <p className="text-purple-300 font-black text-sm uppercase tracking-[.3em]">Lab Test Management & Results</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform cursor-pointer">
                    <FlaskConical className="mb-4" size={40} />
                    <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Total Requests</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.totalRequests || 0}</h3>
                </div>

                <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => navigate('/lab/tests?status=Pending')}>
                    <Clock className="mb-4" size={40} />
                    <p className="text-xs font-black text-orange-200 uppercase tracking-widest mb-2">Pending Tests</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.pendingRequests || 0}</h3>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform cursor-pointer">
                    <TrendingUp className="mb-4" size={40} />
                    <p className="text-xs font-black text-purple-200 uppercase tracking-widest mb-2">In Progress</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.inProgressRequests || 0}</h3>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => navigate('/lab/tests?status=Completed')}>
                    <CheckCircle className="mb-4" size={40} />
                    <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-2">Completed</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.completedRequests || 0}</h3>
                </div>
            </div>

            {/* Today & Month Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-blue-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <Calendar className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-blue-600">{stats?.todayRequests || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Today's Tests</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Lab requests received today</p>
                </div>

                <div className="bg-white border-2 border-purple-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <FileText className="text-purple-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-purple-600">{stats?.monthRequests || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">This Month</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Total tests this month</p>
                </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Recent Lab Requests
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Last 10 requests</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket #</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tests</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {stats?.recentRequests?.map((req) => (
                                <tr key={req._id} className="hover:bg-slate-50/50 transition-colors cursor-pointer"
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
                    className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform text-left"
                >
                    <FileText className="mb-4" size={40} />
                    <h4 className="text-xl font-black uppercase">Register Patient</h4>
                    <p className="text-sm font-bold text-blue-200 mt-2">Add new patient for lab tests</p>
                </button>

                <button
                    onClick={() => navigate('/lab/tests?status=Pending')}
                    className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform text-left"
                >
                    <Clock className="mb-4" size={40} />
                    <h4 className="text-xl font-black uppercase">Pending Tests</h4>
                    <p className="text-sm font-bold text-orange-200 mt-2">View and process pending requests</p>
                </button>

                <button
                    onClick={() => navigate('/lab/tests?status=Completed')}
                    className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-[2.5rem] shadow-2xl hover:scale-105 transition-transform text-left"
                >
                    <CheckCircle className="mb-4" size={40} />
                    <h4 className="text-xl font-black uppercase">Completed Results</h4>
                    <p className="text-sm font-bold text-emerald-200 mt-2">View completed test results</p>
                </button>
            </div>
        </div>
    );
};

export default LabDashboard;

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Shield, UserPlus, Users, DollarSign, TrendingUp, FlaskConical, Key, UserX, Trash2, Activity } from 'lucide-react';
import { convertSosToUsd } from '../../utils/currency';

const API_BASE_URL = 'https://homecare.nidwa.com';
const DEFAULT_PASSWORD = '1234';

const toDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(null);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', password: DEFAULT_PASSWORD, role: 'Cashier' });

    const authConfig = () => {
        const user = JSON.parse(localStorage.getItem('clinic_user') || '{}');
        return { headers: { Authorization: `Bearer ${user?.token}` } };
    };

    const fetchDashboard = async () => {
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, authConfig());
        setStats(data);
    };

    const fetchStaff = async () => {
        const { data } = await axios.get(`${API_BASE_URL}/api/admin/staff`, authConfig());
        setStaff(data);
    };

    const load = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchDashboard(), fetchStaff()]);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to load admin data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            await axios.post(
                `${API_BASE_URL}/api/admin/staff`,
                { ...newStaff, password: newStaff.password?.trim() || DEFAULT_PASSWORD },
                authConfig()
            );
            setShowAddStaff(false);
            setNewStaff({ name: '', email: '', password: DEFAULT_PASSWORD, role: 'Cashier' });
            await Promise.all([fetchDashboard(), fetchStaff()]);
            alert('Staff member created.');
        } catch (err) {
            alert(err.response?.data?.message || 'Error creating staff');
        }
    };

    const handleToggleStatus = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/admin/staff/${id}/toggle-status`, {}, authConfig());
            await Promise.all([fetchDashboard(), fetchStaff()]);
        } catch (err) {
            alert(err.response?.data?.message || 'Error updating status');
        }
    };

    const handleResetPassword = async (id) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/admin/staff/${id}/reset-password`, {}, authConfig());
            setShowResetPassword(null);
            alert(`Password reset to ${DEFAULT_PASSWORD}`);
        } catch (err) {
            alert(err.response?.data?.message || 'Error resetting password');
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Delete this staff member?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/staff/${id}`, authConfig());
            await Promise.all([fetchDashboard(), fetchStaff()]);
            alert('Staff member deleted.');
        } catch (err) {
            alert(err.response?.data?.message || 'Error deleting staff');
        }
    };

    if (loading) {
        return <div className="text-center py-20 font-bold text-slate-500">Loading Admin Dashboard...</div>;
    }

    const roleStats = stats?.staff?.byRole || {
        cashier: { total: 0, active: 0, suspended: 0 },
        doctor: { total: 0, active: 0, suspended: 0 },
        labTechnician: { total: 0, active: 0, suspended: 0 }
    };

    return (
        <div className="page-section">
            <div className="section-header flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="section-title flex items-center gap-3"><Shield className="text-primary" /> Admin Control</h1>
                    <p className="section-subtitle">Monitor staff activity, finance, sales, patients, and laboratory workflow.</p>
                </div>
                <button onClick={() => setShowAddStaff(true)} className="btn-primary px-5 py-3 text-xs uppercase tracking-wide">
                    <UserPlus size={18} /> Add Staff
                </button>
            </div>

            <div className="metrics-grid">
                <div className="metric-card border-l-4 border-blue-500">
                    <DollarSign className="text-blue-600" size={20} />
                    <p className="metric-label mt-2">Revenue</p>
                    <h3 className="metric-value">{stats?.financial?.totalRevenue?.toLocaleString() || 0} SOS</h3>
                    <p className="metric-hint">${convertSosToUsd(stats?.financial?.totalRevenue || 0)} USD</p>
                </div>
                <div className="metric-card border-l-4 border-primary">
                    <TrendingUp className="text-primary" size={20} />
                    <p className="metric-label mt-2">Profit</p>
                    <h3 className="metric-value">{stats?.financial?.totalProfit?.toLocaleString() || 0} SOS</h3>
                    <p className="metric-hint">Sales: {stats?.financial?.totalSales || 0}</p>
                </div>
                <div className="metric-card border-l-4 border-sky-500">
                    <Users className="text-sky-600" size={20} />
                    <p className="metric-label mt-2">Staff</p>
                    <h3 className="metric-value">{stats?.staff?.active || 0} Active</h3>
                    <p className="metric-hint">{stats?.staff?.suspended || 0} Suspended</p>
                </div>
                <div className="metric-card border-l-4 border-amber-500">
                    <FlaskConical className="text-amber-600" size={20} />
                    <p className="metric-label mt-2">Lab Requests</p>
                    <h3 className="metric-value">{stats?.lab?.totalRequests || 0}</h3>
                    <p className="metric-hint">Awaiting Doctor: {stats?.lab?.awaitingDoctor || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card">
                    <p className="text-xs uppercase font-black text-slate-400">Cashiers</p>
                    <p className="text-2xl font-black text-slate-800">{roleStats.cashier.total}</p>
                    <p className="text-xs font-bold text-slate-500">Active {roleStats.cashier.active} • Suspended {roleStats.cashier.suspended}</p>
                </div>
                <div className="card">
                    <p className="text-xs uppercase font-black text-slate-400">Doctors</p>
                    <p className="text-2xl font-black text-slate-800">{roleStats.doctor.total}</p>
                    <p className="text-xs font-bold text-slate-500">Active {roleStats.doctor.active} • Suspended {roleStats.doctor.suspended}</p>
                </div>
                <div className="card">
                    <p className="text-xs uppercase font-black text-slate-400">Lab Technicians</p>
                    <p className="text-2xl font-black text-slate-800">{roleStats.labTechnician.total}</p>
                    <p className="text-xs font-bold text-slate-500">Active {roleStats.labTechnician.active} • Suspended {roleStats.labTechnician.suspended}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card p-0 overflow-hidden">
                    <div className="border-b border-slate-200 bg-slate-50 p-4">
                        <h3 className="font-black flex items-center gap-2"><Users size={16} /> Staff Management</h3>
                        <p className="text-xs text-slate-500 mt-1">Create roles, suspend/activate staff, and reset password to 1234.</p>
                    </div>
                    <div className="table-shell rounded-none border-0">
                        <table className="data-table striped-table text-sm">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {staff.map((member) => (
                                    <tr key={member._id}>
                                        <td className="px-4 py-3">
                                            <p className="font-black text-slate-800">{member.name}</p>
                                            <p className="text-xs text-slate-500">{member.email}</p>
                                        </td>
                                        <td className="px-4 py-3 font-bold">{member.role}</td>
                                        <td className="px-4 py-3">
                                            <span className={`status-chip ${member.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{member.status}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleToggleStatus(member._id)} className="btn-secondary px-2.5 py-2 bg-amber-100 text-amber-700 border-amber-200" title="Suspend / Activate"><UserX size={14} /></button>
                                                <button onClick={() => setShowResetPassword(member._id)} className="btn-secondary px-2.5 py-2 bg-blue-100 text-blue-700 border-blue-200" title="Reset to 1234"><Key size={14} /></button>
                                                <button onClick={() => handleDeleteStaff(member._id)} className="btn-secondary px-2.5 py-2" title="Delete"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 mb-3"><Activity size={16} /> Recent System Activity</h3>
                    <div className="space-y-3 max-h-[30rem] overflow-y-auto">
                        {(stats?.activityFeed || []).length === 0 && <p className="text-sm text-slate-500 font-bold">No activity found.</p>}
                        {(stats?.activityFeed || []).map((activity, index) => (
                            <div key={`${activity.type}-${index}`} className="border border-slate-100 rounded-xl p-3">
                                <div className="flex justify-between items-center gap-2">
                                    <p className="text-sm font-black text-slate-800">{activity.title}</p>
                                    <span className="status-chip bg-slate-100 text-slate-700">{activity.type}</span>
                                </div>
                                <p className="text-xs text-slate-500 font-bold mt-1">{activity.description}</p>
                                <p className="text-[11px] text-slate-400 font-bold mt-1">{activity.actor} • {toDateTime(activity.createdAt)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="card">
                    <h4 className="font-black text-slate-800 mb-2">Recent Sales</h4>
                    <div className="space-y-2">
                        {(stats?.recentSales || []).slice(0, 5).map((sale) => (
                            <div key={sale._id} className="border border-slate-100 rounded-lg p-3">
                                <p className="text-xs font-black text-slate-800">{sale.invoiceNumber} • {sale.customerName}</p>
                                <p className="text-xs text-slate-500 font-bold">{sale.totalAmount} SOS • {sale.paymentType}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <h4 className="font-black text-slate-800 mb-2">Recent Lab</h4>
                    <div className="space-y-2">
                        {(stats?.recentLabRequests || []).slice(0, 5).map((item) => (
                            <div key={item._id} className="border border-slate-100 rounded-lg p-3">
                                <p className="text-xs font-black text-slate-800">{item.ticketNumber} • {item.patientName}</p>
                                <p className="text-xs text-slate-500 font-bold">{item.status}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="card">
                    <h4 className="font-black text-slate-800 mb-2">Recent Prescriptions</h4>
                    <div className="space-y-2">
                        {(stats?.recentPrescriptions || []).slice(0, 5).map((item) => (
                            <div key={item._id} className="border border-slate-100 rounded-lg p-3">
                                <p className="text-xs font-black text-slate-800">{item.patientId?.name || 'Unknown'} • {item.status}</p>
                                <p className="text-xs text-slate-500 font-bold">Medicines: {item.medicines?.length || 0}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showAddStaff && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                    <div className="card w-full max-w-md">
                        <h3 className="text-2xl font-black text-slate-800 mb-4 uppercase italic">Add Staff</h3>
                        <form onSubmit={handleAddStaff} className="space-y-3">
                            <input type="text" className="input-field" placeholder="Full Name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} required />
                            <input type="email" className="input-field" placeholder="Email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} required />
                            <input type="text" className="input-field" placeholder={`Password (default ${DEFAULT_PASSWORD})`} value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                            <select className="input-field" value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}>
                                <option value="Cashier">Cashier</option>
                                <option value="Doctor">Doctor</option>
                                <option value="Lab Technician">Lab Technician</option>
                            </select>
                            <div className="flex gap-3 pt-2">
                                <button type="button" className="btn-secondary flex-1 uppercase" onClick={() => setShowAddStaff(false)}>Cancel</button>
                                <button type="submit" className="btn-primary flex-1 uppercase">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showResetPassword && (
                <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4">
                    <div className="card w-full max-w-md">
                        <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase italic">Reset Password</h3>
                        <p className="text-sm text-slate-500 font-bold mb-5">This will reset staff password to default: {DEFAULT_PASSWORD}</p>
                        <div className="flex gap-3">
                            <button className="btn-secondary flex-1 uppercase" onClick={() => setShowResetPassword(null)}>Cancel</button>
                            <button className="btn-primary flex-1 uppercase" onClick={() => handleResetPassword(showResetPassword)}>Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;


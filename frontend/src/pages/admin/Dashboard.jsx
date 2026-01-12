import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Package, DollarSign, TrendingUp, AlertTriangle, UserPlus, UserX, Key, Trash2, Edit, Shield, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { convertSosToUsd } from '../../utils/currency';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddStaff, setShowAddStaff] = useState(false);
    const [showResetPassword, setShowResetPassword] = useState(null);
    const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'Cashier' });
    const [resetPassword, setResetPassword] = useState('');

    useEffect(() => {
        fetchDashboard();
        fetchStaff();
    }, []);

    const fetchDashboard = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/admin/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchStaff = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/admin/staff', config);
            setStaff(data);
        } catch (err) { console.error(err); }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://lafoole.somsoftsystems.com/api/admin/staff', newStaff, config);
            setShowAddStaff(false);
            setNewStaff({ name: '', email: '', password: '', role: 'Cashier' });
            fetchStaff();
            alert('Staff member added successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Error adding staff'); }
    };

    const handleToggleStatus = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/admin/staff/${id}/toggle-status`, {}, config);
            fetchStaff();
        } catch (err) { alert(err.response?.data?.message || 'Error updating status'); }
    };

    const handleResetPassword = async (id) => {
        if (!resetPassword) return alert('Please enter a new password');
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`https://lafoole.somsoftsystems.com/api/admin/staff/${id}/reset-password`, { newPassword: resetPassword }, config);
            setShowResetPassword(null);
            setResetPassword('');
            alert('Password reset successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Error resetting password'); }
    };

    const handleDeleteStaff = async (id) => {
        if (!confirm('Are you sure you want to delete this staff member?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.delete(`https://lafoole.somsoftsystems.com/api/admin/staff/${id}`, config);
            fetchStaff();
            alert('Staff member deleted successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Error deleting staff'); }
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="text-center"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p className="text-slate-400 font-bold">Loading Admin Dashboard...</p></div></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                            <Shield size={48} className="text-primary" /> Admin Control Panel
                        </h1>
                        <p className="text-primary font-black text-sm uppercase tracking-[.3em]">System-Wide Monitoring & Staff Management</p>
                    </div>
                    <button
                        onClick={() => setShowAddStaff(true)}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-2xl shadow-primary/30 hover:scale-105 transition-transform flex items-center gap-3"
                    >
                        <UserPlus size={24} /> Add Staff
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <DollarSign className="mb-4" size={40} />
                    <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Total Revenue</p>
                    <h3 className="text-4xl font-black tracking-tighter">{stats?.financial?.totalRevenue?.toLocaleString() || 0} SOS</h3>
                    <p className="text-sm font-bold text-blue-200 mt-2">${convertSosToUsd(stats?.financial?.totalRevenue || 0)} USD</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <TrendingUp className="mb-4" size={40} />
                    <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-2">Net Profit</p>
                    <h3 className="text-4xl font-black tracking-tighter">{stats?.financial?.totalProfit?.toLocaleString() || 0} SOS</h3>
                    <p className="text-sm font-bold text-emerald-200 mt-2">${convertSosToUsd(stats?.financial?.totalProfit || 0)} USD</p>
                </div>

                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <Users className="mb-4" size={40} />
                    <p className="text-xs font-black text-purple-200 uppercase tracking-widest mb-2">Active Staff</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.staff?.activeCashiers || 0}</h3>
                    <p className="text-sm font-bold text-purple-200 mt-2">{stats?.staff?.suspendedCashiers || 0} Suspended</p>
                </div>

                <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-8 rounded-[2.5rem] shadow-2xl">
                    <Package className="mb-4" size={40} />
                    <p className="text-xs font-black text-orange-200 uppercase tracking-widest mb-2">Total Medicines</p>
                    <h3 className="text-5xl font-black tracking-tighter">{stats?.inventory?.totalMedicines || 0}</h3>
                    <p className="text-sm font-bold text-orange-200 mt-2">{stats?.inventory?.outOfStock || 0} Out of Stock</p>
                </div>
            </div>

            {/* Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-red-100 p-6 rounded-[2rem] shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="text-red-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-red-600">{stats?.inventory?.expiredMedicines || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase">Expired Medicines</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-blue-100 p-6 rounded-[2rem] shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <Users className="text-blue-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-blue-600">{stats?.customers?.total || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase">Total Customers</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-2 border-emerald-100 p-6 rounded-[2rem] shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                            <Package className="text-emerald-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-emerald-600">{convertSosToUsd(stats?.inventory?.totalStockValue || 0)}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase">Stock Value (USD)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Yearly Performance Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <Activity className="text-primary" /> Yearly Performance (Last 12 Months)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats?.monthlyData || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '1rem', color: '#fff', fontWeight: 'bold' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Revenue (SOS)" />
                        <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} name="Profit (SOS)" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Staff Management Table */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <Users /> Staff Management
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Create, Suspend, Reset Passwords & Delete Staff</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Email</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {staff.map((member) => (
                                <tr key={member._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{member.name}</p>
                                        <p className="text-xs text-slate-400 font-bold">{member.email}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-black uppercase">{member.role}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${member.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                            {member.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleToggleStatus(member._id)}
                                                className={`p-2 rounded-xl ${member.status === 'Active' ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'} transition-colors`}
                                                title={member.status === 'Active' ? 'Suspend' : 'Activate'}
                                            >
                                                <UserX size={18} />
                                            </button>
                                            <button
                                                onClick={() => setShowResetPassword(member._id)}
                                                className="p-2 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                title="Reset Password"
                                            >
                                                <Key size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(member._id)}
                                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Staff Modal */}
            {showAddStaff && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
                        <h3 className="text-3xl font-black text-slate-800 mb-6 uppercase italic">Add New Staff</h3>
                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <input type="text" className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email</label>
                                <input type="email" className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold" value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                                <input type="password" className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold" value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} required />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                                <select className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}>
                                    <option value="Cashier">Cashier</option>
                                    <option value="Doctor">Doctor</option>
                                    <option value="Lab Technician">Lab Technician</option>
                                </select>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button type="button" onClick={() => setShowAddStaff(false)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase">Cancel</button>
                                <button type="submit" className="flex-1 bg-primary text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-primary/30">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPassword && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
                        <h3 className="text-3xl font-black text-slate-800 mb-6 uppercase italic">Reset Password</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Password</label>
                                <input type="password" className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => setShowResetPassword(null)} className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase">Cancel</button>
                                <button onClick={() => handleResetPassword(showResetPassword)} className="flex-1 bg-primary text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-primary/30">Reset</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;

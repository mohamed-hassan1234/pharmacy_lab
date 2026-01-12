import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Truck, Package, AlertTriangle, DollarSign, TrendingUp, TrendingDown, ShoppingCart, Calendar, Award, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { convertSosToUsd } from '../../utils/currency';

const CashierDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/cashier/dashboard', config);
            setStats(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 font-bold">Loading Dashboard...</p>
            </div>
        </div>
    );

    const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic">Pharmacy Dashboard</h1>
                    <p className="text-primary font-black text-sm uppercase tracking-[.3em]">Real-Time Store Analytics & Performance</p>
                    <div className="mt-4 flex items-center gap-2 text-white/60">
                        <Calendar size={16} />
                        <span className="text-xs font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                    <DollarSign className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                    <div className="relative z-10">
                        <p className="text-xs font-black text-blue-200 uppercase tracking-widest mb-2">Total Revenue</p>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">{stats?.totalRevenue?.toLocaleString() || 0} SOS</h3>
                        <p className="text-sm font-bold text-blue-200 italic">${convertSosToUsd(stats?.totalRevenue || 0)} USD</p>
                        <div className="mt-4 flex items-center gap-2 text-blue-200">
                            <TrendingUp size={16} />
                            <span className="text-xs font-bold">{stats?.totalSales || 0} Total Sales</span>
                        </div>
                    </div>
                </div>

                {/* Total Profit */}
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                    <TrendingUp className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                    <div className="relative z-10">
                        <p className="text-xs font-black text-emerald-200 uppercase tracking-widest mb-2">Net Profit</p>
                        <h3 className="text-4xl font-black tracking-tighter mb-1">{stats?.totalProfit?.toLocaleString() || 0} SOS</h3>
                        <p className="text-sm font-bold text-emerald-200 italic">${convertSosToUsd(stats?.totalProfit || 0)} USD</p>
                        <div className="mt-4 flex items-center gap-2 text-emerald-200">
                            <Award size={16} />
                            <span className="text-xs font-bold">Pure Earnings</span>
                        </div>
                    </div>
                </div>

                {/* Total Customers */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                    <Users className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                    <div className="relative z-10">
                        <p className="text-xs font-black text-purple-200 uppercase tracking-widest mb-2">Total Customers</p>
                        <h3 className="text-5xl font-black tracking-tighter mb-1">{stats?.totalCustomers || 0}</h3>
                        <p className="text-sm font-bold text-purple-200 italic">Registered Patients</p>
                        <div className="mt-4 flex items-center gap-2 text-purple-200">
                            <ShoppingCart size={16} />
                            <span className="text-xs font-bold">Active Buyers</span>
                        </div>
                    </div>
                </div>

                {/* Total Suppliers */}
                <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform">
                    <Truck className="absolute -right-4 -bottom-4 text-white/10 group-hover:scale-110 transition-transform" size={120} />
                    <div className="relative z-10">
                        <p className="text-xs font-black text-orange-200 uppercase tracking-widest mb-2">Total Suppliers</p>
                        <h3 className="text-5xl font-black tracking-tighter mb-1">{stats?.totalSuppliers || 0}</h3>
                        <p className="text-sm font-bold text-orange-200 italic">Active Partners</p>
                        <div className="mt-4 flex items-center gap-2 text-orange-200">
                            <Package size={16} />
                            <span className="text-xs font-bold">{stats?.totalMedicines || 0} Medicines</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts & Stock Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-red-100 p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="text-red-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-red-600">{stats?.outOfStock || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Out of Stock</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Medicines with less than 5 units remaining</p>
                </div>

                <div className="bg-white border-2 border-orange-100 p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                            <Calendar className="text-orange-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-orange-600">{stats?.nearExpiry || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Near Expiry</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Expiring within 30 days</p>
                </div>

                <div className="bg-white border-2 border-slate-200 p-6 rounded-[2rem] shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Package className="text-slate-600" size={28} />
                        </div>
                        <div>
                            <h4 className="text-2xl font-black text-slate-600">{stats?.expiredMedicines || 0}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Expired</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Already expired medicines</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Yearly Revenue & Profit Chart */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <BarChart3 className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Yearly Performance</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase">Revenue vs Profit (Last 12 Months)</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={stats?.monthlyData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '1rem',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Revenue (SOS)" />
                            <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} name="Profit (SOS)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Sales Count */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <ShoppingCart className="text-purple-600" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Sales Activity</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase">Monthly Transaction Count</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={stats?.monthlyData || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <YAxis tick={{ fontSize: 10, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: 'none',
                                    borderRadius: '1rem',
                                    color: '#fff',
                                    fontWeight: 'bold'
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            <Bar dataKey="sales" fill="#8b5cf6" name="Total Sales" radius={[10, 10, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Selling Medicines */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                        <Award className="text-emerald-600" size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Top 5 Best Sellers</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase">Highest Revenue Generators</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {stats?.topMedicines?.map((med, idx) => (
                        <div key={idx} className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all text-center">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3 font-black text-xl">
                                #{idx + 1}
                            </div>
                            <h4 className="font-black text-slate-800 text-sm mb-2 tracking-tight">{med.name}</h4>
                            <p className="text-xs text-slate-400 font-bold mb-1">{med.quantity} Units Sold</p>
                            <p className="text-sm font-black text-primary">{med.revenue.toLocaleString()} SOS</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CashierDashboard;

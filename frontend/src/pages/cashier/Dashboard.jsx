import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import {
    ShoppingCart,
    Truck,
    Users,
    Package
} from 'lucide-react';
import { convertSosToUsd } from '../../utils/currency';

const CashierDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [debts, setDebts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
        fetchDebts();
    }, []);

    const fetchDashboard = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/dashboard', config);
            setStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDebts = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/debts', config);
            setDebts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const monthlyData = useMemo(() => (stats?.monthlyData || []).slice(-8), [stats]);
    const revenueCostData = useMemo(
        () =>
            monthlyData.map((row) => ({
                month: row.month,
                revenue: Number(row.revenue) || 0,
                cost: Number(row.cost) || 0
            })),
        [monthlyData]
    );
    const totalExpenses = Number(stats?.totalCost || 0);

    const topDebts = [...debts].sort((a, b) => (b.remainingBalance || 0) - (a.remainingBalance || 0)).slice(0, 4);

    const ringCards = useMemo(() => {
        const values = [
            Number(stats?.totalSales) || 0,
            Number(stats?.totalCustomers) || 0,
            Number(stats?.totalMedicines) || 0,
            Number(stats?.totalSuppliers) || 0
        ];
        const max = Math.max(...values, 1);
        return [
            {
                label: 'Total Sales',
                value: Number(stats?.totalSales) || 0,
                note: `${stats?.nearExpiry || 0} near expiry`,
                color: '#3b82f6',
                icon: ShoppingCart
            },
            {
                label: 'Customers',
                value: Number(stats?.totalCustomers) || 0,
                note: 'Registered customers',
                color: '#84cc16',
                icon: Users
            },
            {
                label: 'Medicines',
                value: Number(stats?.totalMedicines) || 0,
                note: `${stats?.outOfStock || 0} low stock`,
                color: '#f59e0b',
                icon: Package
            },
            {
                label: 'Suppliers',
                value: Number(stats?.totalSuppliers) || 0,
                note: 'Active suppliers',
                color: '#ef4444',
                icon: Truck
            }
        ].map((item) => ({
            ...item,
            progress: Math.max(8, Math.round((item.value / max) * 100))
        }));
    }, [stats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-semibold">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-section animate-in fade-in duration-500">
            <div className="section-header">
                <h1 className="section-title">Overview Dashboard</h1>
                <p className="section-subtitle">Your live pharmacy data in the new dashboard layout.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
                {ringCards.map((card) => (
                    <div key={card.label} className="card text-center">
                        <p className="text-lg font-semibold text-slate-800">{card.label}</p>
                        <p className="text-4xl font-bold text-slate-900 mt-1">{card.value.toLocaleString()}</p>
                        <div
                            className="stat-ring mt-5"
                            style={{
                                '--ring-value': `${card.progress}%`,
                                '--ring-color': card.color
                            }}
                        >
                            <div className="stat-ring-center">
                                <card.icon size={30} color={card.color} />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">{card.note}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="dashboard-chart-card xl:col-span-1 space-y-6">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">Recent Activity</h3>
                        <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">Live trend from your data</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-600">Total Profit</p>
                            <span className="text-primary text-sm font-semibold">
                                {stats?.totalProfit ? `+${Math.min(99, Math.round((stats.totalProfit / Math.max(stats.totalRevenue || 1, 1)) * 100))}%` : '0%'}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 mb-2">
                            {Number(stats?.totalProfit || 0).toLocaleString()} SOS
                        </p>
                        <p className="text-xs text-slate-500 mb-2">${convertSosToUsd(stats?.totalProfit || 0)} USD</p>
                        <ResponsiveContainer width="100%" height={90}>
                            <AreaChart data={monthlyData}>
                                <Area type="monotone" dataKey="profit" stroke="#1cc588" fill="#d1fae5" strokeWidth={2.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-600">Expenses</p>
                            <span className="text-sky-600 text-sm font-semibold">
                                {stats?.totalRevenue ? `${Math.round((totalExpenses / Math.max(stats.totalRevenue, 1)) * 100)}%` : '0%'}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900 mb-2">
                            {totalExpenses.toLocaleString()} SOS
                        </p>
                        <p className="text-xs text-slate-500 mb-2">${convertSosToUsd(totalExpenses)} USD</p>
                        <ResponsiveContainer width="100%" height={90}>
                            <AreaChart data={monthlyData}>
                                <Area type="monotone" dataKey="cost" stroke="#38bdf8" fill="#e0f2fe" strokeWidth={2.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="dashboard-chart-card xl:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h3 className="text-3xl font-bold text-slate-900">
                            Revenue vs Cost <span className="text-slate-400 text-2xl">(monthly)</span>
                        </h3>
                        <p className="text-sm text-slate-500">
                            Timezone: <span className="font-semibold text-slate-700">GMT-0400 Eastern Daylight Time</span>
                        </p>
                    </div>
                    <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={revenueCostData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" />
                            <Tooltip
                                formatter={(value) => {
                                    const amount = Number(value) || 0;
                                    return [`${amount.toLocaleString()} SOS ($${convertSosToUsd(amount)} USD)`];
                                }}
                            />
                            <Legend />
                            <Bar dataKey="revenue" name="Revenue" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="cost" name="Cost" fill="#f87171" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="card lg:col-span-2">
                    <h3 className="chart-title">Financial Snapshot</h3>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs text-slate-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-slate-900">{Number(stats?.totalRevenue || 0).toLocaleString()} SOS</p>
                            <p className="text-xs text-slate-500">${convertSosToUsd(stats?.totalRevenue || 0)} USD</p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs text-slate-500">Net Profit</p>
                            <p className="text-2xl font-bold text-slate-900">{Number(stats?.totalProfit || 0).toLocaleString()} SOS</p>
                            <p className="text-xs text-slate-500">${convertSosToUsd(stats?.totalProfit || 0)} USD</p>
                        </div>
                    </div>
                </div>

                <div className="card lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="chart-title">Top Debt Balances</h3>
                        <button onClick={() => navigate('/cashier/debts')} className="btn-secondary text-xs">
                            View All
                        </button>
                    </div>
                    <div className="space-y-2">
                        {topDebts.map((debt) => (
                            <div key={debt._id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">{debt.customerName}</p>
                                    <p className="text-xs text-slate-500">{debt.invoiceNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-amber-700">{Number(debt.remainingBalance || 0).toLocaleString()} SOS</p>
                                    <p className="text-[11px] text-slate-500">${convertSosToUsd(debt.remainingBalance || 0)} USD</p>
                                </div>
                            </div>
                        ))}
                        {topDebts.length === 0 && <p className="text-sm text-slate-500">No pending debts.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashierDashboard;



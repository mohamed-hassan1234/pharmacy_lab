import { useState, useEffect } from 'react';
import axios from 'axios';
import { FileBarChart, Printer, Download, DollarSign, TrendingUp, ShoppingBag, CreditCard, History, Package, Calendar } from 'lucide-react';

import { convertUsdToSos, convertSosToUsd } from '../../utils/currency';

const CashierReports = () => {
    const [sales, setSales] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
                const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/cashier/reports', config);
                setSales(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, []);

    if (loading) return <div className="p-10 text-center animate-pulse">Gathering financial data...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border-b-4 border-primary">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">STORE PERFORMANCE</h2>
                    <p className="text-primary uppercase text-[10px] font-black tracking-[.3em] mt-1">Simple Financial Overview for Beginners</p>
                </div>
                <button onClick={() => window.print()} className="btn-primary flex items-center gap-3 px-10 py-4 rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 transition-transform">
                    <Printer size={24} /> <span className="font-black">PRINT MY REPORT</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 1. Money I Paid (Expenses) */}
                <div className="card border-0 bg-blue-700 text-white shadow-xl p-6 rounded-3xl relative overflow-hidden">
                    <ShoppingBag className="absolute -right-4 -bottom-4 text-white/10" size={100} />
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">1. TOTAL PURCHASE COST</p>
                    <h4 className="text-[10px] font-bold opacity-60 mb-2 leading-none">(What you paid suppliers)</h4>
                    <p className="text-3xl font-black tracking-tighter">{sales?.totalCost?.toLocaleString() || 0} SOS</p>
                    <p className="text-xs font-black text-blue-200 mt-2 italic underline">${convertSosToUsd(sales?.totalCost || 0)} USD</p>
                </div>

                {/* 2. Money I Got (Earnings) */}
                <div className="card border-0 bg-slate-900 text-white shadow-xl p-6 rounded-3xl relative overflow-hidden">
                    <TrendingUp className="absolute -right-4 -bottom-4 text-white/5" size={100} />
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">2. TOTAL SALES CASH</p>
                    <h4 className="text-[10px] font-bold opacity-60 mb-2 leading-none">(Total money from customers)</h4>
                    <p className="text-3xl font-black tracking-tighter">{sales?.totalRevenue?.toLocaleString() || 0} SOS</p>
                    <p className="text-xs font-black text-primary mt-2 italic underline">${convertSosToUsd(sales?.totalRevenue || 0)} USD</p>
                </div>

                {/* 3. My Net Profit (Trusted) */}
                <div className="card border-0 bg-primary text-white shadow-xl p-6 rounded-3xl relative overflow-hidden">
                    <DollarSign className="absolute -right-4 -bottom-4 text-white/5" size={100} />
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">3. NET PROFIT MADE</p>
                    <h4 className="text-[10px] font-bold opacity-80 mb-2 text-slate-900 leading-none">(Sales minus buying cost)</h4>
                    <p className="text-3xl font-black tracking-tighter text-slate-900">{sales?.totalProfit?.toLocaleString() || 0} SOS</p>
                    <p className="text-xs font-black text-slate-900 mt-2 italic underline">${convertSosToUsd(sales?.totalProfit || 0)} USD</p>
                </div>

                {/* 4. Money on Shelf (Security) */}
                <div className="card border-0 bg-emerald-600 text-white shadow-xl p-6 rounded-3xl relative overflow-hidden">
                    <Package className="absolute -right-4 -bottom-4 text-white/10" size={100} />
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">4. STOCK MONEY VALUE</p>
                    <h4 className="text-[10px] font-bold opacity-80 mb-2 leading-none">(Money currently in boxes)</h4>
                    <p className="text-3xl font-black tracking-tighter">{sales?.investedStockValue?.toLocaleString() || 0} SOS</p>
                    <p className="text-xs font-black text-emerald-200 mt-2 italic underline">${convertSosToUsd(sales?.investedStockValue || 0)} USD</p>
                </div>
            </div>

            {/* REAL-TIME BOX AUDIT SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6 tracking-tight italic">
                        <Package className="text-primary" /> REAL-TIME STOCK AUDIT
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Full Boxes</p>
                            <p className="text-4xl font-black text-slate-800">{sales?.totalFullBoxes || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Closed Packages</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Open Box Pills</p>
                            <p className="text-4xl font-black text-emerald-600">{sales?.totalLoosePills || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Individual Units</p>
                        </div>
                    </div>
                </div>

                <div className="bg-orange-50 border-2 border-orange-100 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <CreditCard size={28} />
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-orange-800 tracking-tight">MONEY OUTSIDE (DAYN)</h4>
                            <p className="text-xs font-bold text-orange-600 uppercase">Customers who still owe you</p>
                        </div>
                    </div>
                    <div className="flex items-end justify-between">
                        <p className="text-5xl font-black text-orange-600 tracking-tighter">{sales?.totalDebts?.toLocaleString() || 0} SOS</p>
                        <p className="text-sm font-black text-orange-400 italic mb-1">${convertSosToUsd(sales?.totalDebts || 0)} USD</p>
                    </div>
                </div>
            </div>

            {/* Trusted Transaction table */}
            <div className="card bg-white border border-slate-100 shadow-sm p-0 overflow-hidden rounded-[2.5rem]">
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter italic">
                        <History className="text-primary" /> TRUSTED SALES JOURNAL
                    </h3>
                    <div className="flex gap-2">
                        <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/30 uppercase tracking-widest flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div> Verified Transactions
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale Info</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Used</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-blue-600 text-center">Cost Value</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-900 text-center">Actual Revenue</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-600 text-center">Real Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {sales?.recentTransactions?.map((t, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm tracking-tight">{t.customerName || 'Walk-in'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Calendar size={10} /> {new Date(t.createdAt).toLocaleString()} • {t.invoiceNumber}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                            {t.items?.map((item, i) => (
                                                <span key={i} className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600 uppercase border border-slate-200 shadow-sm">
                                                    {item.quantity} {item.sellType} OF {item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <p className="font-black text-blue-600 text-sm">{t.totalCost?.toLocaleString()} SOS</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Inventory Cost</p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <p className="font-black text-slate-900 text-sm">{t.totalAmount?.toLocaleString()} SOS</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Cash Collected</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col items-center">
                                            <div className={`font-black text-sm p-1 px-4 rounded-xl border ${t.profit > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                {t.profit > 0 ? '+' : ''}{t.profit?.toLocaleString()} SOS
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 pl-1">Audited Net</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CashierReports;

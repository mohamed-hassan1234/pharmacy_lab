import { useState, useEffect } from 'react';
import axios from 'axios';
import { Printer, DollarSign, TrendingUp, ShoppingBag, CreditCard, History, Package, Calendar } from 'lucide-react';

import { convertUsdToSos, convertSosToUsd } from '../../utils/currency';

const CashierReports = () => {
    const [sales, setSales] = useState({});
    const [period, setPeriod] = useState('daily');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [appliedStartDate, setAppliedStartDate] = useState('');
    const [appliedEndDate, setAppliedEndDate] = useState('');
    const [loading, setLoading] = useState(true);
    const formatUsd = (sosValue) => `$${convertSosToUsd(Number(sosValue) || 0)} USD`;
    const periodOptions = [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'yearly', label: 'Yearly' }
    ];

    const calcDiff = (current, previous) => {
        const currentValue = Number(current) || 0;
        const previousValue = Number(previous) || 0;
        const diff = currentValue - previousValue;
        if (previousValue === 0) {
            return { diff, percent: currentValue === 0 ? 0 : 100 };
        }
        return { diff, percent: Math.round((Math.abs(diff) / Math.abs(previousValue)) * 100) };
    };

    const revenueDiff = calcDiff(sales?.totalRevenue, sales?.previous?.totalRevenue);
    const profitDiff = calcDiff(sales?.totalProfit, sales?.previous?.totalProfit);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
                const params = new URLSearchParams();
                params.set('period', period);
                if (appliedStartDate && appliedEndDate) {
                    params.set('startDate', appliedStartDate);
                    params.set('endDate', appliedEndDate);
                }
                const { data } = await axios.get(`http://localhost:5010/api/cashier/reports?${params.toString()}`, config);
                setSales(data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, [period, appliedStartDate, appliedEndDate]);

    const handleApplyDateFilter = () => {
        if (!startDate || !endDate) {
            alert('Please select both start date and end date.');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            alert('End date must be after or equal to start date.');
            return;
        }
        setAppliedStartDate(startDate);
        setAppliedEndDate(endDate);
    };

    const handleClearDateFilter = () => {
        setStartDate('');
        setEndDate('');
        setAppliedStartDate('');
        setAppliedEndDate('');
    };

    if (loading) return <div className="p-10 text-center animate-pulse">Gathering financial data...</div>;

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h2 className="section-title">Store Performance</h2>
                    <p className="section-subtitle">
                        {sales?.periodRange?.currentLabel || 'Current period'} report from your real data.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {periodOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setPeriod(option.value)}
                            className={period === option.value ? 'btn-primary px-4 py-2 text-xs' : 'btn-secondary px-4 py-2 text-xs'}
                        >
                            {option.label}
                        </button>
                    ))}
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="min-w-[145px]"
                        aria-label="Start date"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="min-w-[145px]"
                        aria-label="End date"
                    />
                    <button type="button" onClick={handleApplyDateFilter} className="btn-secondary px-4 py-2 text-xs">
                        Apply Dates
                    </button>
                    <button type="button" onClick={handleClearDateFilter} className="btn-secondary px-4 py-2 text-xs">
                        Clear
                    </button>
                    <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 px-6 py-3 uppercase tracking-wide text-xs">
                        <Printer size={18} /> <span className="font-black">Print Report</span>
                    </button>
                </div>
            </div>

            <div className="card bg-slate-50 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Period</p>
                        <p className="text-sm font-semibold text-slate-800">
                            {sales?.periodRange?.currentLabel || 'Current'} ({sales?.period || period})
                        </p>
                        {sales?.filterMode === 'custom' && (
                            <p className="text-xs text-slate-500 mt-1">
                                {sales?.periodRange?.startDate} to {sales?.periodRange?.endDate}
                            </p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Revenue vs {sales?.periodRange?.previousLabel || 'Previous'}</p>
                        <p className={`text-sm font-semibold ${revenueDiff.diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {revenueDiff.diff >= 0 ? '+' : ''}{(revenueDiff.diff || 0).toLocaleString()} SOS ({revenueDiff.percent}%)
                        </p>
                        <p className="text-xs text-slate-500">{formatUsd(revenueDiff.diff)}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Profit vs {sales?.periodRange?.previousLabel || 'Previous'}</p>
                        <p className={`text-sm font-semibold ${profitDiff.diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {profitDiff.diff >= 0 ? '+' : ''}{(profitDiff.diff || 0).toLocaleString()} SOS ({profitDiff.percent}%)
                        </p>
                        <p className="text-xs text-slate-500">{formatUsd(profitDiff.diff)}</p>
                    </div>
                </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Cash Sales (SOS / USD)</p>
                    <p className="text-4xl font-black text-emerald-700">{sales?.cashRevenue?.toLocaleString() || 0}</p>
                    <p className="text-xs font-black text-emerald-500 mt-1">{formatUsd(sales?.cashRevenue)}</p>
                    <p className="text-xs font-black text-emerald-500 mt-2">Paid instantly</p>
                </div>
                <div className="bg-orange-50 border-2 border-orange-100 p-6 rounded-3xl">
                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Credit Sales (SOS / USD)</p>
                    <p className="text-4xl font-black text-orange-700">{sales?.creditRevenue?.toLocaleString() || 0}</p>
                    <p className="text-xs font-black text-orange-500 mt-1">{formatUsd(sales?.creditRevenue)}</p>
                    <p className="text-xs font-black text-orange-500 mt-2">Recorded as debt/dayn</p>
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
            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6 flex justify-between items-center">
                    <h3 className="text-xl font-black flex items-center gap-3 tracking-tighter italic">
                        <History className="text-primary" /> TRUSTED SALES JOURNAL
                    </h3>
                    <div className="flex gap-2">
                        <span className="bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full border border-primary/30 uppercase tracking-widest flex items-center gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div> Verified Transactions
                        </span>
                    </div>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Sale Info</th>
                                <th>Inventory Used</th>
                                <th>Cost Value (SOS / USD)</th>
                                <th>Actual Revenue (SOS / USD)</th>
                                <th>Real Profit (SOS / USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales?.recentTransactions?.map((t, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm tracking-tight">{t.customerName || 'Walk-in'}</span>
                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Calendar size={10} /> {new Date(t.createdAt).toLocaleString()} • {t.invoiceNumber}
                                            </span>
                                            <span className={`mt-1 text-[9px] font-black w-fit px-2 py-0.5 rounded-full border ${t.paymentType === 'CASH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                                {t.paymentType === 'CASH' ? 'Cash / Shilin' : 'Credit / Dayn'}
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
                                        <p className="text-[10px] font-bold text-blue-500">{formatUsd(t.totalCost)}</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Inventory Cost</p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <p className="font-black text-slate-900 text-sm">{t.totalAmount?.toLocaleString()} SOS</p>
                                        <p className="text-[10px] font-bold text-slate-500">{formatUsd(t.totalAmount)}</p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase">Cash Collected</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col items-center">
                                            <div className={`font-black text-sm p-1 px-4 rounded-xl border ${t.profit > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                {t.profit > 0 ? '+' : ''}{t.profit?.toLocaleString()} SOS
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1">{formatUsd(t.profit)}</p>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase mt-1 pl-1">Audited Net</p>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="bg-emerald-700 p-6 text-white">
                    <h3 className="text-xl font-black tracking-tighter italic">PATIENT MEDICINE PURCHASE LIST</h3>
                    <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest mt-1">Patients who bought medicines after doctor consultation</p>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Diagnosis / Notes</th>
                                <th>Medicines Bought</th>
                                <th>Payment</th>
                                <th>Amount (SOS / USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(sales?.patientMedicinePurchases || []).length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest">No patient purchase records yet</td>
                                </tr>
                            ) : (sales.patientMedicinePurchases || []).map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="px-8 py-4">
                                        <p className="font-black text-slate-800">{row.patientName || 'Unknown'}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{row.invoiceNumber} • {new Date(row.createdAt).toLocaleString()}</p>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="text-xs font-black text-slate-700">{row.diagnosis || 'No diagnosis'}</p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-1">{row.physicalExamination || 'No notes'}</p>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {(row.items || []).map((item, i) => (
                                                <span key={i} className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100">
                                                    {item.quantity} {item.sellType} {item.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${row.paymentType === 'CASH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                            {row.paymentType === 'CASH' ? 'Cash / Shilin' : 'Credit / Dayn'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4">
                                        <p className="font-black text-slate-800">{row.totalAmount?.toLocaleString()} SOS</p>
                                        <p className="text-[10px] font-bold text-slate-500">{formatUsd(row.totalAmount)}</p>
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



import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Search, DollarSign, CheckCircle, Clock, User } from 'lucide-react';
import { convertSosToUsd } from '../../utils/currency';

const Debts = () => {
    const [debts, setDebts] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [payModal, setPayModal] = useState(null); // Debt object to pay
    const [paymentAmount, setPaymentAmount] = useState('');

    useEffect(() => {
        fetchDebts();
    }, []);

    const fetchDebts = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/debts', config);
            setDebts(data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handlePayment = async () => {
        if (!paymentAmount || paymentAmount <= 0) return alert('Fadlan geli lacag sax ah.');
        if (Number(paymentAmount) > Number(payModal?.remainingBalance || 0)) {
            return alert('Lacagta la bixiyey kama badnaan karto daynta harsan.');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`http://localhost:5010/api/cashier/debts/${payModal._id}`, { amountPaid: paymentAmount }, config);
            setPayModal(null);
            setPaymentAmount('');
            fetchDebts();
            alert('Lacag-bixinta si guul leh ayaa loo keydiyey.');
        } catch (err) { alert(err.response?.data?.message || 'Qalad ayaa ka dhacay keydinta lacag-bixinta.'); }
    };

    const filtered = debts.filter(d => d.customerName.toLowerCase().includes(search.toLowerCase()) || d.invoiceNumber.includes(search));
    const paymentValue = Number(paymentAmount) || 0;
    const remainingAfterPayment = payModal ? Math.max((Number(payModal.remainingBalance) || 0) - paymentValue, 0) : 0;

    return (
        <div className="page-section animate-in fade-in duration-500">
            <div className="section-header flex flex-wrap justify-between items-center gap-3">
                <div>
                    <h2 className="section-title">Daymaha Macaamiisha</h2>
                    <p className="section-subtitle">Ururi lacagta oo cusboonaysii akoonnada bukaanka.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="RAADI MACMIIL AMA BIIL..."
                        className="w-[300px] pl-12 pr-6 py-4 text-sm font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((debt) => (
                    <div key={debt._id} className="bg-white rounded-[2rem] p-6 shadow-md border border-slate-100 hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            {debt.status === 'PARTIAL' ? (
                                <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-200 uppercase italic">Qayb La Bixiyey</span>
                            ) : (
                                <span className="bg-red-100 text-red-600 text-[10px] font-black px-3 py-1 rounded-full border border-red-200 uppercase italic">Aan La Bixin</span>
                            )}
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:bg-orange-600 transition-colors">
                                <User size={28} />
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{debt.customerName}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Clock size={12} /> {new Date(debt.createdAt).toLocaleDateString()} • {debt.invoiceNumber}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Wadarta Biilka:</span>
                                <span className="font-bold text-slate-600">{debt.totalAmount.toLocaleString()} SOS</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-600">
                                <span className="text-[10px] font-black uppercase">Hore Loo Bixiyey:</span>
                                <span className="font-black">-{debt.paidAmount.toLocaleString()} SOS</span>
                            </div>
                            <div className="h-px bg-slate-200 my-2"></div>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">Weli Lagu Leeyahay:</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight">{debt.remainingBalance.toLocaleString()} SOS</p>
                                </div>
                                <p className="text-xs font-black text-slate-400 underline italic">${convertSosToUsd(debt.remainingBalance)} USD</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setPayModal(debt)}
                            className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 uppercase tracking-widest italic"
                        >
                            <DollarSign size={20} /> Qaado Lacag
                        </button>
                    </div>
                ))}
            </div>

            {/* Payment Modal */}
            {payModal && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <CreditCard size={40} />
                            </div>
                            <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Qaado Lacag-bixin</h3>
                            <p className="text-slate-400 font-bold text-sm mt-1">Lacagta waxaa laga qaadayaa: <span className="text-slate-800">{payModal.customerName}</span></p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">Lacagta La Helay (SOS)</label>
                                    <span className="text-[10px] font-black text-orange-600 uppercase">Ugu badnaan: {payModal.remainingBalance.toLocaleString()}</span>
                                </div>
                                <input
                                    type="number"
                                    className="w-full bg-slate-100 border-none rounded-2xl p-6 text-3xl font-black text-slate-800 focus:ring-4 focus:ring-orange-500/20 transition-all placeholder:text-slate-300"
                                    placeholder="000,000"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    autoFocus
                                />
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => setPaymentAmount(String(payModal.remainingBalance))}
                                        className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full hover:bg-black transition-colors"
                                    >
                                        GELI WADARTA GUUD
                                    </button>
                                </div>
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Lacag-bixintan kadib</p>
                                    {remainingAfterPayment > 0 ? (
                                        <p className="mt-1 text-lg font-black text-orange-600">{remainingAfterPayment.toLocaleString()} SOS ayaa weli lagu leeyahay</p>
                                    ) : (
                                        <p className="mt-1 text-lg font-black text-emerald-600">Dayn ma jiro</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setPayModal(null)}
                                    className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest italic"
                                >
                                    Jooji
                                </button>
                                <button
                                    onClick={handlePayment}
                                    className="flex-[2] bg-orange-600 text-white font-black py-5 rounded-3xl shadow-2xl shadow-orange-600/30 hover:bg-orange-700 hover:-translate-y-1 transition-all uppercase tracking-widest italic flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={20} /> Xaqiiji Lacag-bixinta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {filtered.length === 0 && !loading && (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                    <CheckCircle className="mx-auto text-emerald-300 mb-4" size={80} />
                    <h3 className="text-2xl font-black text-slate-800 uppercase italic">War Wanaagsan!</h3>
                    <p className="text-slate-400 font-bold">Dhammaan macaamiishu way bixiyeen biilashooda. Dayn sugaysa ma jirto.</p>
                </div>
            )}
        </div>
    );
};

export default Debts;



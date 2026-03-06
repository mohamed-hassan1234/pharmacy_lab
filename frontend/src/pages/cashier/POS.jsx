import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Trash2, Search, Printer, User, CreditCard, Banknote, FileText, Clock } from 'lucide-react';

import { convertUsdToSos, convertSosToUsd } from '../../utils/currency';

const PharmacyPOS = () => {
    const [medicines, setMedicines] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [paymentType, setPaymentType] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState(null);
    const [prescriptions, setPrescriptions] = useState([]);
    const [showPrescriptions, setShowPrescriptions] = useState(false);
    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);

    const normalizeText = (value) => (value || '').toString().trim().toLowerCase();
    const parsePrescribedQuantity = (dosage) => {
        const text = (dosage || '').toString().toLowerCase();
        const boxMatch = text.match(/(\d+)\s*box/);
        const pillMatch = text.match(/(\d+)\s*pill/);
        const boxes = boxMatch ? Number.parseInt(boxMatch[1], 10) : 0;
        const pills = pillMatch ? Number.parseInt(pillMatch[1], 10) : 0;
        return {
            boxes: Number.isFinite(boxes) ? boxes : 0,
            pills: Number.isFinite(pills) ? pills : 0
        };
    };


    const SOS_TO_USD_DISPLAY = 28000; // Kept for display purposes, actual conversion uses utility

    useEffect(() => {
        fetchMedicines();
        fetchCustomers();
        fetchPrescriptions();
    }, []);


    const fetchMedicines = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/inventory/medicines', config);
            setMedicines(data);
        } catch (err) { console.error(err); }
    };

    const fetchCustomers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/customers', config);
            setCustomers(data);
        } catch (err) { console.error(err); }
    };

    const fetchPrescriptions = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/prescriptions', config);
            setPrescriptions(data);
        } catch (err) { console.error(err); }
    };


    const addToCart = (med, sellType, qty = 1) => {
        const quantityToAdd = Math.max(1, Number.parseInt(qty, 10) || 1);
        const cartId = `${med._id}-${sellType}`;
        const existing = cart.find(item => item.cartId === cartId);

        const price = sellType === 'BOX' ? (med.sellingPricePerBox || med.sellingPricePerUnit * med.unitsPerBox) : med.sellingPricePerUnit;

        if (existing) {
            const nextQty = item => item.quantity + quantityToAdd;
            setCart(cart.map(item => item.cartId === cartId ? { ...item, quantity: nextQty(item), total: nextQty(item) * price } : item));
        } else {
            setCart([...cart, {
                cartId,
                medicineId: med._id,
                name: med.name,
                sellType,
                price,
                quantity: quantityToAdd,
                total: quantityToAdd * price
            }]);
        }
    };

    const calculateTotal = () => cart.reduce((acc, item) => acc + item.total, 0);

    const processSale = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const total = calculateTotal();
            const { data } = await axios.post('http://localhost:5010/api/cashier/sales', {
                items: cart,
                customerName: selectedCustomerId ? customers.find(c => c._id === selectedCustomerId)?.name : customerName,
                customerId: selectedCustomerId || null,
                paymentType,
                paidAmount: paymentType === 'CASH' ? total : paidAmount,
                prescriptionId: selectedPrescriptionId
            }, config);

            setSaleSuccess(data);
            setCart([]);
            setSelectedCustomerId('');
            setCustomerName('Walk-in Customer');
            setPaidAmount(0);
            setSelectedPrescriptionId(null);
            fetchMedicines();
            fetchPrescriptions();

        } catch (err) { alert(err.response?.data?.message || 'Sale failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-6">
            <div className="section-header">
                <h1 className="section-title">Point of Sale</h1>
                <p className="section-subtitle">Sell medicines by unit or box, attach prescriptions, and complete payment flow.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* inventory side */}
            <div className="lg:col-span-2 space-y-6">
                <div className="card border-2 border-slate-100 bg-white">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-slate-800 tracking-tighter italic">1. FIND MEDICINE</h3>
                        <p className="text-[10px] text-medical-muted font-bold uppercase">Type the name of the pill or box below</p>
                    </div>

                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={20} />
                            <input type="text" className="input-field pl-10 h-14 text-lg font-bold border-primary/20 bg-primary/5" placeholder="Search medicine name..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <button
                            onClick={() => setShowPrescriptions(!showPrescriptions)}
                            className={`px-6 rounded-2xl font-black text-xs uppercase flex items-center gap-2 transition-all ${prescriptions.length > 0 ? 'bg-orange-100 text-orange-600 animate-pulse border-orange-200 border-2' : 'bg-slate-100 text-slate-400 opacity-50'}`}
                        >
                            <FileText size={18} />
                            Prescriptions ({prescriptions.length})
                        </button>
                    </div>

                    {showPrescriptions && (
                        <div className="mb-6 p-6 bg-orange-50 rounded-[2rem] border-2 border-orange-100 animate-in slide-in-from-top duration-300">
                            <h4 className="text-sm font-black text-orange-800 uppercase italic mb-4 flex items-center gap-2">
                                <Clock size={16} /> Latest Doctor Prescriptions
                            </h4>
                            <div className="space-y-3">
                                {prescriptions.map(p => (
                                    <div key={p._id} className="bg-white p-4 rounded-2xl border border-orange-100 flex justify-between items-center shadow-sm">
                                        <div>
                                            <p className="font-black text-slate-800 uppercase italic">{p.patientId?.name || 'Unknown'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.diagnosis}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1">Notes: {p.physicalExamination || 'No physical notes'}</p>
                                            <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase italic">By Dr. {p.doctorId?.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold mt-1">
                                                Medicines: {(p.medicines || []).map(m => `${m.name} (${m.dosage || '-'}, ${m.duration || '-'})`).filter(Boolean).join(' | ') || 'None'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Load medicines from prescription into cart
                                                setSelectedPrescriptionId(p._id);
                                                setSelectedCustomerId('');
                                                setCustomerName(p.patientId?.name || 'Walk-in Customer');
                                                const missingMeds = [];
                                                p.medicines.forEach(pm => {
                                                    const med = medicines.find(m => pm.medicineId && m._id?.toString() === pm.medicineId?.toString()) ||
                                                        medicines.find(m => normalizeText(m.name) === normalizeText(pm.name));

                                                    if (med) {
                                                        const prescribed = parsePrescribedQuantity(pm.dosage);
                                                        if (prescribed.boxes > 0) addToCart(med, 'BOX', prescribed.boxes);
                                                        if (prescribed.pills > 0) addToCart(med, 'UNIT', prescribed.pills);
                                                        if (prescribed.boxes === 0 && prescribed.pills === 0) addToCart(med, 'UNIT', 1);
                                                    } else {
                                                        missingMeds.push(pm.name || 'Unknown medicine');
                                                    }
                                                });

                                                if (missingMeds.length > 0) {
                                                    alert(`These prescribed medicines are not available in inventory: ${missingMeds.join(', ')}`);
                                                }
                                                setShowPrescriptions(false);
                                            }}
                                            className="px-4 py-2 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-orange-700 shadow-lg shadow-orange-600/30"
                                        >
                                            Load to Cart
                                        </button>

                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase())).map(med => (
                            <div key={med._id} className="p-5 bg-slate-50 border border-slate-200 rounded-3xl hover:bg-white hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all flex justify-between items-center group">
                                <div className="flex-1">
                                    <h4 className="font-black text-xl text-slate-800 tracking-tight uppercase">{med.name}</h4>
                                    <div className="flex gap-4 mt-2">
                                        <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 flex-1">
                                            <p className="text-[10px] font-black text-emerald-600 leading-none mb-1">1 PILL (UNIT)</p>
                                            <span className="text-sm font-black text-slate-800">{med.sellingPricePerUnit?.toLocaleString()} SOS</span>
                                        </div>
                                        <div className="bg-white px-3 py-2 rounded-2xl border border-slate-100 flex-1">
                                            <p className="text-[10px] font-black text-blue-600 leading-none mb-1">1 FULL BOX</p>
                                            <span className="text-sm font-black text-slate-800">{med.sellingPricePerBox?.toLocaleString() || (med.sellingPricePerUnit * med.unitsPerBox)?.toLocaleString()} SOS</span>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-tighter">Stock: {med.boxesInStock} Boxes + {med.totalUnitsInStock % med.unitsPerBox} Pills</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => addToCart(med, 'UNIT')} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md">
                                        <Plus size={16} /> <span className="text-[10px] font-black uppercase">Sell 1 Pill</span>
                                    </button>
                                    <button onClick={() => addToCart(med, 'BOX')} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md">
                                        <Plus size={16} /> <span className="text-[10px] font-black uppercase">Sell 1 Box</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sidebar POS */}
            <div className="lg:col-span-2 space-y-6">
                <div className="card flex flex-col h-[85vh] border-2 border-primary/20 bg-white">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                        <h3 className="text-xl font-black flex items-center gap-2 italic tracking-tighter">
                            <ShoppingCart className="text-primary" /> 2. CHECKOUT (INVOICE)
                        </h3>
                        <div className="text-right bg-slate-900 text-white px-4 py-2 rounded-2xl">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Rate Used</p>
                            <p className="text-sm font-black italic">$1 = 28 SOS</p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 italic"><User size={12} /> Who is buying?</label>
                            <select
                                className="input-field h-12 font-bold border-slate-200"
                                value={selectedCustomerId}
                                onChange={e => {
                                    setSelectedCustomerId(e.target.value);
                                    if (!e.target.value) setCustomerName('Walk-in Customer');
                                }}
                            >
                                <option value="">--- New/Walk-in ---</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>{c.name} ({c.phone || 'No Phone'})</option>
                                ))}
                            </select>
                            {!selectedCustomerId && (
                                <input
                                    type="text"
                                    className="input-field h-10 text-xs mt-1 italic border-dashed"
                                    placeholder="Enter Customer Name if No ID..."
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 italic"><CreditCard size={12} /> Payment Method</label>
                            <select className="input-field h-12 font-black border-slate-200 bg-slate-50" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                                <option value="CASH">💵 GIVE CASH (Paid)</option>
                                <option value="CREDIT">💳 CREDIT (Debts/Dayn)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 mb-6 bg-slate-50/50 p-2 rounded-xl border border-dashed border-slate-200">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30">
                                <ShoppingCart size={64} /> <p className="font-bold mt-2">NO ITEMS ADDED</p>
                            </div>
                        ) : cart.map((item, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center animate-in slide-in-from-right duration-200">
                                <div>
                                    <p className="font-bold text-sm">{item.name}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${item.sellType === 'BOX' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.sellType}</span>
                                        <span className="text-xs text-slate-500">{item.quantity} x {item.price.toLocaleString()} SOS</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-slate-800">{item.total.toLocaleString()} SOS</span>
                                    <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200">
                        {paymentType === 'CREDIT' && (
                            <div className="mb-2 animate-in fade-in duration-300">
                                <label className="text-xs font-bold text-red-500 uppercase">Paid Amount Now (SOS)</label>
                                <input type="number" className="input-field mt-1 py-2 border-red-200 bg-red-50/20" value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))} />
                            </div>
                        )}
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Total in USD</p>
                                <p className="text-xl font-bold text-slate-500">~ ${convertSosToUsd(calculateTotal())}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-slate-400 uppercase">Grand Total (SOS)</p>
                                <p className="text-4xl font-bold text-primary">{calculateTotal().toLocaleString()} SOS</p>
                            </div>
                        </div>
                        <button
                            onClick={processSale}
                            disabled={cart.length === 0 || loading}
                            className={`w-full py-5 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all ${paymentType === 'CASH' ? 'bg-primary text-white shadow-primary/30' : 'bg-orange-600 text-white shadow-orange-200'}`}
                        >
                            {loading ? 'PROCESSING...' : (paymentType === 'CASH' ? <><Banknote /> PRINT INVOICE</> : <><CreditCard /> SAVE DEBT (DAYN)</>)}
                        </button>
                    </div>
                </div>

                {saleSuccess && (
                    <div className="card bg-slate-900 text-white animate-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-primary">TRANSACTION COMPLETED</span>
                            <span className="text-xs font-mono">{saleSuccess.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-sm opacity-60">Customer: {saleSuccess.customerName}</p>
                                <p className="text-sm opacity-60">Profit: {saleSuccess.profit.toLocaleString()} SOS</p>
                            </div>
                            <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all">
                                <Printer size={18} /> <span className="font-bold">PRINT</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default PharmacyPOS;



import { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { Search, FileText, Pill, Stethoscope, User, Calendar, CheckCircle, Eye, ShoppingCart, CreditCard, Banknote } from 'lucide-react';

const DoctorConsultations = () => {
    const [consultations, setConsultations] = useState([]);
    const [inventoryMedicines, setInventoryMedicines] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [paymentType, setPaymentType] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [processingSale, setProcessingSale] = useState(false);
    const [notice, setNotice] = useState('');

    const getAuthConfig = () => ({
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
    });

    useEffect(() => {
        fetchCompletedConsultations();
        fetchInventoryMedicines();
        const interval = setInterval(() => {
            fetchCompletedConsultations();
            fetchInventoryMedicines();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

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

    const isConsultationDispensed = (consultation) => {
        const prescriptionStatus = typeof consultation?.prescriptionId === 'object'
            ? consultation?.prescriptionId?.status
            : null;
        return Boolean(consultation?.dispensedAt) || prescriptionStatus === 'Dispensed';
    };

    const buildSaleItemsFromConsultation = (consultation) => {
        const meds = consultation?.medicines || [];
        const saleMap = new Map();
        const requestedUnitsByMedicine = {};
        const medicineRefById = {};
        const missingMeds = [];

        const addSaleItem = (med, sellType, quantity) => {
            if (!quantity || quantity <= 0) return;
            const key = `${med._id}-${sellType}`;
            const unitPrice = sellType === 'BOX'
                ? (med.sellingPricePerBox || (med.sellingPricePerUnit * med.unitsPerBox))
                : med.sellingPricePerUnit;

            if (saleMap.has(key)) {
                const existing = saleMap.get(key);
                const nextQty = existing.quantity + quantity;
                saleMap.set(key, { ...existing, quantity: nextQty, total: nextQty * unitPrice });
                return;
            }

            saleMap.set(key, {
                medicineId: med._id,
                name: med.name,
                sellType,
                quantity,
                price: unitPrice,
                total: quantity * unitPrice
            });
        };

        for (const prescribed of meds) {
            const matchedMed = inventoryMedicines.find((m) => prescribed.medicineId && m._id?.toString() === prescribed.medicineId?.toString()) ||
                inventoryMedicines.find((m) => normalizeText(m.name) === normalizeText(prescribed.name));

            if (!matchedMed) {
                missingMeds.push(prescribed.name || 'Unknown medicine');
                continue;
            }

            const parsed = parsePrescribedQuantity(prescribed.dosage);
            let boxes = parsed.boxes;
            let pills = parsed.pills;
            if (boxes === 0 && pills === 0) pills = 1;

            const unitsPerBox = Number(matchedMed.unitsPerBox) || 1;
            const requestedUnits = (boxes * unitsPerBox) + pills;

            medicineRefById[matchedMed._id] = matchedMed;
            requestedUnitsByMedicine[matchedMed._id] = (requestedUnitsByMedicine[matchedMed._id] || 0) + requestedUnits;

            addSaleItem(matchedMed, 'BOX', boxes);
            addSaleItem(matchedMed, 'UNIT', pills);
        }

        for (const medicineId of Object.keys(requestedUnitsByMedicine)) {
            const med = medicineRefById[medicineId];
            const availableUnits = Number(med?.totalUnitsInStock) || 0;
            const requestedUnits = requestedUnitsByMedicine[medicineId];
            if (requestedUnits > availableUnits) {
                return {
                    items: [],
                    missingMeds,
                    error: `Insufficient stock for ${med?.name || 'medicine'} (requested ${requestedUnits}, available ${availableUnits})`
                };
            }
        }

        return { items: Array.from(saleMap.values()), missingMeds, error: null };
    };

    const fetchCompletedConsultations = async () => {
        try {
            const { data } = await axios.get('https://homecare.nidwa.com/api/lab/requests', getAuthConfig());
            const completed = (Array.isArray(data) ? data : []).filter((r) => r.status === 'Completed' && r.doctorConclusion);
            setConsultations(completed);
        } catch (err) { console.error(err); }
    };

    const fetchInventoryMedicines = async () => {
        try {
            const { data } = await axios.get('https://homecare.nidwa.com/api/inventory/medicines', getAuthConfig());
            setInventoryMedicines(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
    };

    const openConsultation = (consultation) => {
        setSelectedConsultation(consultation);
        setPaymentType('CASH');
        setPaidAmount(0);
    };

    const handleSellFromConsultation = async () => {
        if (!selectedConsultation) return;
        if (isConsultationDispensed(selectedConsultation)) {
            alert('This patient already bought the prescribed medicine.');
            return;
        }

        const built = buildSaleItemsFromConsultation(selectedConsultation);
        if (built.error) {
            alert(built.error);
            return;
        }
        if (built.missingMeds.length > 0) {
            alert(`These medicines are missing from inventory: ${built.missingMeds.join(', ')}`);
            return;
        }
        if (built.items.length === 0) {
            alert('No medicines to sell for this consultation.');
            return;
        }

        const total = built.items.reduce((sum, item) => sum + item.total, 0);
        const paidNow = paymentType === 'CASH' ? total : Math.max(0, Number(paidAmount) || 0);
        if (paymentType === 'CREDIT' && paidNow > total) {
            alert('Paid amount cannot be greater than total amount.');
            return;
        }

        setProcessingSale(true);
        try {
            const prescriptionId = typeof selectedConsultation.prescriptionId === 'object'
                ? selectedConsultation.prescriptionId?._id
                : selectedConsultation.prescriptionId;

            const { data } = await axios.post('https://homecare.nidwa.com/api/cashier/sales', {
                items: built.items,
                customerName: selectedConsultation.patientName,
                customerId: null,
                paymentType,
                paidAmount: paidNow,
                prescriptionId: prescriptionId || null,
                labRequestId: selectedConsultation._id
            }, getAuthConfig());

            setNotice(`Patient ${selectedConsultation.patientName} bought medicine successfully. Invoice: ${data.invoiceNumber}`);
            setSelectedConsultation(null);
            fetchCompletedConsultations();
            fetchInventoryMedicines();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to process patient purchase');
        } finally {
            setProcessingSale(false);
        }
    };

    const filtered = consultations.filter((c) =>
        c.patientName.toLowerCase().includes(search.toLowerCase()) ||
        c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.doctorConclusion?.toLowerCase().includes(search.toLowerCase())
    );

    const purchaseReadyCount = consultations.filter((c) => !isConsultationDispensed(c)).length;
    const boughtCount = consultations.filter((c) => isConsultationDispensed(c)).length;

    const salePreview = useMemo(() => {
        if (!selectedConsultation) return { items: [], missingMeds: [], error: null };
        return buildSaleItemsFromConsultation(selectedConsultation);
    }, [selectedConsultation, inventoryMedicines]);

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                        <Stethoscope size={48} className="text-emerald-400" /> Doctor Notes & Patient Purchase
                    </h1>
                    <p className="text-emerald-300 font-black text-sm uppercase tracking-[.3em]">View diagnosis and sell medicines here directly</p>
                </div>
            </div>

            {notice && (
                <div className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-2xl px-6 py-4 font-black">
                    {notice}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-lg">
                    <h4 className="text-3xl font-black text-emerald-600">{consultations.length}</h4>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Doctor Notes</p>
                </div>
                <div className="bg-white border-2 border-blue-100 p-8 rounded-[2.5rem] shadow-lg">
                    <h4 className="text-3xl font-black text-blue-600">{purchaseReadyCount}</h4>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Ready to Buy</p>
                </div>
                <div className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-lg">
                    <h4 className="text-3xl font-black text-emerald-700">{boughtCount}</h4>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Already Bought</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by patient, ticket, or diagnosis..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Doctor Notes ({filtered.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicines</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Purchase Status</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                                        No doctor notes found
                                    </td>
                                </tr>
                            ) : filtered.map((consultation) => {
                                const bought = isConsultationDispensed(consultation);
                                return (
                                    <tr key={consultation._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <span className="font-black text-emerald-600">{consultation.ticketNumber}</span>
                                            <p className="text-xs text-slate-400 font-bold">{new Date(consultation.updatedAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-black text-slate-800">{consultation.patientName}</p>
                                            <p className="text-xs text-slate-400 font-bold">{consultation.age}y • {consultation.sex}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-slate-700 line-clamp-2 max-w-xs">{consultation.doctorConclusion}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="font-black text-blue-600">{consultation.medicines?.length || 0} items</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {bought ? (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Bought {consultation.dispensedAt ? `(${new Date(consultation.dispensedAt).toLocaleDateString()})` : ''}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200">
                                                    Waiting to Buy
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => openConsultation(consultation)}
                                                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-xs uppercase flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                                            >
                                                <Eye size={16} /> Open
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedConsultation && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-5xl rounded-[3rem] p-10 shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Doctor Note & Direct Purchase</h3>
                                <p className="text-slate-600 font-bold">{selectedConsultation.patientName} • {selectedConsultation.ticketNumber}</p>
                            </div>
                            <button onClick={() => setSelectedConsultation(null)} className="px-6 py-3 bg-slate-100 rounded-2xl font-black uppercase hover:bg-slate-200">
                                Close
                            </button>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-2xl mb-6 border-2 border-blue-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Patient</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Doctor</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.doctorName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Diagnosis</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.doctorConclusion}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Notes</p>
                                    <p className="font-black text-slate-700">{selectedConsultation.physicalExamination || 'No notes'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-200 mb-6">
                            <h4 className="font-black text-emerald-900 uppercase mb-4 flex items-center gap-2">
                                <Pill size={18} /> Prescribed Medicines
                            </h4>
                            <div className="space-y-3">
                                {(selectedConsultation.medicines || []).map((med, index) => (
                                    <div key={index} className="bg-white rounded-xl p-4 border border-emerald-100">
                                        <p className="font-black text-slate-800">{med.name}</p>
                                        <p className="text-xs font-bold text-slate-500 mt-1">Dosage: {med.dosage || 'Not specified'}</p>
                                        <p className="text-xs font-bold text-slate-500">Duration: {med.duration || 'Not specified'}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {isConsultationDispensed(selectedConsultation) ? (
                            <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-5 text-emerald-800 font-black">
                                This patient already bought the prescribed medicines.
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                                    <ShoppingCart size={18} /> Buy Medicines In This Page
                                </h4>

                                {salePreview.error && (
                                    <p className="text-red-600 font-black text-sm mb-3">{salePreview.error}</p>
                                )}
                                {salePreview.missingMeds.length > 0 && (
                                    <p className="text-red-600 font-black text-sm mb-3">
                                        Missing in inventory: {salePreview.missingMeds.join(', ')}
                                    </p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Payment Method</label>
                                        <select
                                            className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-3 font-black outline-none"
                                            value={paymentType}
                                            onChange={(e) => setPaymentType(e.target.value)}
                                        >
                                            <option value="CASH">Cash / Shilin</option>
                                            <option value="CREDIT">Credit / Dayn</option>
                                        </select>
                                    </div>
                                    {paymentType === 'CREDIT' && (
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Paid Now (SOS)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="mt-1 w-full bg-white border border-slate-200 rounded-xl px-3 py-3 font-black outline-none"
                                                value={paidAmount}
                                                onChange={(e) => setPaidAmount(Number(e.target.value))}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Sale Items Preview</p>
                                    <div className="space-y-1">
                                        {salePreview.items.length === 0 ? (
                                            <p className="text-sm font-bold text-slate-400">No sale items generated</p>
                                        ) : salePreview.items.map((item, i) => (
                                            <p key={i} className="text-sm font-black text-slate-700">
                                                {item.quantity} {item.sellType} {item.name} - {item.total.toLocaleString()} SOS
                                            </p>
                                        ))}
                                    </div>
                                    <p className="text-sm font-black text-emerald-700 mt-3">
                                        Total: {salePreview.items.reduce((sum, item) => sum + item.total, 0).toLocaleString()} SOS
                                    </p>
                                </div>

                                <button
                                    onClick={handleSellFromConsultation}
                                    disabled={processingSale || salePreview.items.length === 0 || Boolean(salePreview.error) || salePreview.missingMeds.length > 0}
                                    className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {processingSale ? 'Processing...' : (
                                        <>
                                            {paymentType === 'CASH' ? <Banknote size={18} /> : <CreditCard size={18} />}
                                            Complete Patient Purchase
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="mt-6 flex justify-center">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-full">
                                <CheckCircle size={20} />
                                <span className="font-black uppercase text-sm">Doctor Note Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultations;


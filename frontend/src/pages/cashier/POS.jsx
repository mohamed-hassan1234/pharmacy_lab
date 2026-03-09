import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Banknote, CreditCard, FileText, Plus, Printer, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { convertSosToUsd } from '../../utils/currency';

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const PharmacyPOS = () => {
    const [medicines, setMedicines] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [customerName, setCustomerName] = useState('Walk-in Customer');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [paymentType, setPaymentType] = useState('CASH');
    const [paidAmount, setPaidAmount] = useState(0);
    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
    const [saleSuccess, setSaleSuccess] = useState(null);
    const [showPrescriptions, setShowPrescriptions] = useState(false);
    const [loading, setLoading] = useState(false);

    const authConfig = () => ({
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
    });

    const loadAll = async () => {
        try {
            const [medicineRes, customerRes, prescriptionRes] = await Promise.all([
                axios.get('http://localhost:5010/api/inventory/medicines', authConfig()),
                axios.get('http://localhost:5010/api/cashier/customers', authConfig()),
                axios.get('http://localhost:5010/api/cashier/prescriptions', authConfig())
            ]);
            setMedicines(Array.isArray(medicineRes.data) ? medicineRes.data : []);
            setCustomers(Array.isArray(customerRes.data) ? customerRes.data : []);
            setPrescriptions(Array.isArray(prescriptionRes.data) ? prescriptionRes.data : []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const addToCart = (medicine, sellType, quantity = 1) => {
        const qty = Math.max(1, Number.parseInt(quantity, 10) || 1);
        const cartId = `${medicine._id}-${sellType}`;
        const price = sellType === 'BOX'
            ? (medicine.sellingPricePerBox || medicine.sellingPricePerUnit * medicine.unitsPerBox)
            : medicine.sellingPricePerUnit;

        setCart((prev) => {
            const existing = prev.find((item) => item.cartId === cartId);
            if (existing) {
                return prev.map((item) => item.cartId === cartId
                    ? { ...item, quantity: item.quantity + qty, total: (item.quantity + qty) * price }
                    : item);
            }
            return [...prev, { cartId, medicineId: medicine._id, name: medicine.name, sellType, quantity: qty, price, total: qty * price }];
        });
    };

    const loadPrescriptionToCart = (prescription) => {
        setSelectedPrescriptionId(prescription._id);
        setSelectedCustomerId('');
        setCustomerName(prescription.patientId?.name || 'Walk-in Customer');

        (prescription.medicines || []).forEach((prescribed) => {
            const matched = medicines.find((medicine) =>
                (prescribed.medicineId && medicine._id?.toString() === prescribed.medicineId?.toString()) ||
                medicine.name?.trim().toLowerCase() === prescribed.name?.trim().toLowerCase()
            );
            if (!matched) return;
            addToCart(matched, 'UNIT', 1);
        });

        setShowPrescriptions(false);
    };

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.total, 0), [cart]);
    const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId) || null;
    const saleSummary = saleSuccess?.paymentSummary || null;

    const printInvoice = (sale, existingWindow = null) => {
        const printWindow = existingWindow || window.open('', '', 'width=900,height=1000');
        if (!printWindow) {
            alert('Invoice window was blocked.');
            return;
        }

        const summary = sale.paymentSummary || {
            paidAmount: sale.paymentType === 'CASH' ? sale.totalAmount : 0,
            remainingBalance: 0,
            status: sale.status
        };
        const rows = (sale.items || []).map((item) => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.sellType)}</td>
                <td>${Number(item.quantity || 0).toLocaleString()}</td>
                <td>${Number(item.unitPrice || 0).toLocaleString()} SOS</td>
                <td>${Number(item.total || 0).toLocaleString()} SOS</td>
            </tr>
        `).join('');

        printWindow.document.open();
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice ${escapeHtml(sale.invoiceNumber)}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; }
                        th { background: #f8fafc; font-size: 11px; text-transform: uppercase; }
                        .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-top: 16px; }
                        .row { display: flex; justify-content: space-between; margin-top: 8px; }
                    </style>
                </head>
                <body>
                    <h1>Pharmacy Invoice</h1>
                    <div class="box">
                        <div class="row"><strong>Invoice</strong><span>${escapeHtml(sale.invoiceNumber)}</span></div>
                        <div class="row"><strong>Date</strong><span>${new Date(sale.createdAt || Date.now()).toLocaleString()}</span></div>
                        <div class="row"><strong>Customer</strong><span>${escapeHtml(sale.customerName)}</span></div>
                        <div class="row"><strong>Payment</strong><span>${escapeHtml(sale.paymentType)}</span></div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Type</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <div class="box">
                        <div class="row"><strong>Paid Now</strong><span>${Number(summary.paidAmount || 0).toLocaleString()} SOS</span></div>
                        <div class="row"><strong>Remaining Debt</strong><span>${Number(summary.remainingBalance || 0).toLocaleString()} SOS</span></div>
                        <div class="row"><strong>Grand Total</strong><span>${Number(sale.totalAmount || 0).toLocaleString()} SOS</span></div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 200);
    };

    const processSale = async () => {
        if (cart.length === 0) return;
        const paidNow = paymentType === 'CASH' ? total : Math.max(0, Number(paidAmount) || 0);
        if (paymentType === 'CREDIT' && paidNow > total) {
            alert('Paid amount cannot be greater than total amount.');
            return;
        }

        const printWindow = window.open('', '', 'width=900,height=1000');
        if (printWindow) {
            printWindow.document.write('<div style="font-family: Arial, sans-serif; padding: 24px;">Preparing invoice...</div>');
        }

        setLoading(true);
        try {
            const { data } = await axios.post('http://localhost:5010/api/cashier/sales', {
                items: cart,
                customerName: selectedCustomer ? selectedCustomer.name : customerName,
                customerId: selectedCustomerId || null,
                paymentType,
                paidAmount: paidNow,
                prescriptionId: selectedPrescriptionId
            }, authConfig());

            setSaleSuccess(data);
            setCart([]);
            setSelectedCustomerId('');
            setCustomerName('Walk-in Customer');
            setPaidAmount(0);
            setSelectedPrescriptionId(null);
            loadAll();
            printInvoice(data, printWindow);
        } catch (error) {
            if (printWindow) printWindow.close();
            alert(error.response?.data?.message || 'Sale failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="section-header">
                <h1 className="section-title">Point of Sale</h1>
                <p className="section-subtitle">Sell medicines, manage debt safely, and print the saved invoice correctly.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-2 card space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={20} />
                            <input className="input-field pl-10 h-12" placeholder="Search medicine..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <button type="button" onClick={() => setShowPrescriptions((prev) => !prev)} className="btn-secondary px-4 py-2 text-xs uppercase">
                            <FileText size={16} /> Prescriptions
                        </button>
                    </div>

                    {showPrescriptions && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 space-y-3">
                            {(prescriptions || []).map((prescription) => (
                                <div key={prescription._id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 border border-orange-100">
                                    <div>
                                        <p className="font-black text-slate-800">{prescription.patientId?.name || 'Unknown'}</p>
                                        <p className="text-xs text-slate-500">{prescription.diagnosis || 'No diagnosis'}</p>
                                    </div>
                                    <button type="button" onClick={() => loadPrescriptionToCart(prescription)} className="btn-primary px-3 py-2 text-xs">
                                        Load
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                        {medicines.filter((medicine) => medicine.name.toLowerCase().includes(search.toLowerCase())).map((medicine) => (
                            <div key={medicine._id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div>
                                    <p className="font-black text-slate-800">{medicine.name}</p>
                                    <p className="text-xs text-slate-500">Stock: {medicine.boxesInStock} boxes / {medicine.totalUnitsInStock} units</p>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => addToCart(medicine, 'UNIT')} className="btn-secondary px-3 py-2 text-xs">
                                        <Plus size={14} /> Unit
                                    </button>
                                    <button type="button" onClick={() => addToCart(medicine, 'BOX')} className="btn-primary px-3 py-2 text-xs">
                                        <Plus size={14} /> Box
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 card space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black uppercase text-slate-500">Customer</label>
                            <select
                                className="input-field mt-2"
                                value={selectedCustomerId}
                                onChange={(e) => {
                                    setSelectedCustomerId(e.target.value);
                                    if (!e.target.value) setCustomerName('Walk-in Customer');
                                }}
                            >
                                <option value="">Walk-in / New customer</option>
                                {customers.map((customer) => (
                                    <option key={customer._id} value={customer._id}>{customer.name}</option>
                                ))}
                            </select>
                            {!selectedCustomerId && (
                                <input className="input-field mt-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
                            )}
                            {selectedCustomer && (
                                <div className={`mt-2 rounded-xl border px-3 py-2 ${Number(selectedCustomer.outstandingDebt) > 0 ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                    {Number(selectedCustomer.outstandingDebt) > 0
                                        ? `${Number(selectedCustomer.outstandingDebt).toLocaleString()} SOS debt`
                                        : 'No debt'}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase text-slate-500">Payment</label>
                            <select className="input-field mt-2" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                                <option value="CASH">Cash / Paid</option>
                                <option value="CREDIT">Credit / Debt</option>
                            </select>
                            {paymentType === 'CREDIT' && (
                                <input className="input-field mt-2" type="number" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} placeholder="Paid now (SOS)" />
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-dashed border-slate-200 p-3 space-y-3 min-h-[18rem]">
                        {cart.length === 0 ? (
                            <div className="flex h-full min-h-[14rem] flex-col items-center justify-center text-slate-400">
                                <ShoppingCart size={48} />
                                <p className="mt-2 font-bold">No items added</p>
                            </div>
                        ) : cart.map((item, index) => (
                            <div key={item.cartId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                <div>
                                    <p className="font-black text-slate-800">{item.name}</p>
                                    <p className="text-xs text-slate-500">{item.quantity} {item.sellType} x {item.price.toLocaleString()} SOS</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="font-black">{item.total.toLocaleString()} SOS</p>
                                    <button type="button" onClick={() => setCart(cart.filter((_, itemIndex) => itemIndex !== index))} className="text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-500">Total USD</p>
                            <p className="text-lg font-bold text-slate-600">${convertSosToUsd(total)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black uppercase text-slate-500">Total SOS</p>
                            <p className="text-3xl font-black text-primary">{total.toLocaleString()} SOS</p>
                        </div>
                    </div>

                    <button type="button" onClick={processSale} disabled={cart.length === 0 || loading} className={`w-full ${paymentType === 'CASH' ? 'btn-primary' : 'btn-secondary'} py-4 text-sm uppercase`}>
                        {loading ? 'Processing...' : (paymentType === 'CASH' ? <><Banknote size={16} /> Save And Print Invoice</> : <><CreditCard size={16} /> Save Debt And Print Invoice</>)}
                    </button>

                    {saleSuccess && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-black">{saleSuccess.invoiceNumber}</p>
                                    <p className="text-sm text-slate-300">{saleSuccess.customerName}</p>
                                </div>
                                <button type="button" onClick={() => printInvoice(saleSuccess)} className="btn-secondary px-3 py-2 text-xs">
                                    <Printer size={14} /> Print Again
                                </button>
                            </div>
                            <div className="mt-3 space-y-1 text-sm text-slate-300">
                                <p>Total: {saleSuccess.totalAmount.toLocaleString()} SOS</p>
                                <p>Paid: {Number(saleSummary?.paidAmount || 0).toLocaleString()} SOS</p>
                                <p>{Number(saleSummary?.remainingBalance || 0) > 0 ? `Debt: ${Number(saleSummary.remainingBalance).toLocaleString()} SOS` : 'No debt'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PharmacyPOS;

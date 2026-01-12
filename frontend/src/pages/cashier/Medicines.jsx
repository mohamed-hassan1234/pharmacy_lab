import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Plus, DollarSign, Layers, Hash, Calendar } from 'lucide-react';
import { convertUsdToSos, convertSosToUsd } from '../../utils/currency';

const MedicineRegistration = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        supplierId: '',
        purchasePricePerBox: '',
        unitsPerBox: '',
        sellingPricePerUnit: '',
        sellingPricePerBox: '',
        boxesBought: '',
        expiryDate: ''
    });

    const [usdInput, setUsdInput] = useState({ purchase: '', selling: '', sellingBox: '' });

    const handleUsdChange = (type, val) => {
        const value = parseFloat(val) || 0;
        const sosVal = convertUsdToSos(value);
        setUsdInput({ ...usdInput, [type]: val });
        if (type === 'purchase') {
            setFormData({ ...formData, purchasePricePerBox: sosVal });
        } else if (type === 'selling') {
            setFormData({ ...formData, sellingPricePerUnit: sosVal });
        } else {
            setFormData({ ...formData, sellingPricePerBox: sosVal });
        }
    };

    const handleSosChange = (type, val) => {
        const value = parseInt(val) || 0;
        const usdVal = convertSosToUsd(value);
        if (type === 'purchase') {
            setFormData({ ...formData, purchasePricePerBox: value });
            setUsdInput({ ...usdInput, purchase: usdVal });
        } else if (type === 'selling') {
            setFormData({ ...formData, sellingPricePerUnit: value });
            setUsdInput({ ...usdInput, selling: usdVal });
        } else {
            setFormData({ ...formData, sellingPricePerBox: value });
            setUsdInput({ ...usdInput, sellingBox: usdVal });
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchMedicines();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/inventory/suppliers', config);
            setSuppliers(data);
        } catch (err) { console.error(err); }
    };

    const fetchMedicines = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/inventory/medicines', config);
            setMedicines(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://lafoole.somsoftsystems.com/api/inventory/medicines', formData, config);
            setFormData({ name: '', category: '', supplierId: '', purchasePricePerBox: '', unitsPerBox: '', sellingPricePerUnit: '', boxesBought: '', expiryDate: '' });
            fetchMedicines();
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Medicine Management (SOS)</h2>
                    <p className="text-medical-muted">Register and track medicine stock by box/unit</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                <div className="xl:col-span-1 border-r border-slate-100 pr-4">
                    <div className="card sticky top-8 border-2 border-primary/20 bg-white">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                <Plus className="text-primary" />
                                ADD MEDICINE
                            </h2>
                            <p className="text-[10px] text-medical-muted font-black uppercase tracking-widest">Follow the steps below</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Step 1: Basic Info */}
                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded w-fit">Step 1: Details</p>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Name of Medicine</label>
                                    <input type="text" className="input-field" placeholder="e.g. Panadol" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">Supplier (Buying From)</label>
                                    <select className="input-field" value={formData.supplierId} onChange={e => setFormData({ ...formData, supplierId: e.target.value })} required>
                                        <option value="">-- Choose Supplier --</option>
                                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Step 2: Buying Price */}
                            <div className="space-y-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-600/10 px-2 py-0.5 rounded w-fit">Step 2: How much you buy</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Buy for ($ USD)</label>
                                        <input type="number" step="0.01" className="input-field border-blue-200" value={usdInput.purchase} onChange={e => handleUsdChange('purchase', e.target.value)} placeholder="0.00 $" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Buy for (SOS)</label>
                                        <input type="number" className="input-field bg-white" value={formData.purchasePricePerBox} onChange={e => handleSosChange('purchase', e.target.value)} required />
                                    </div>
                                </div>
                                <p className="text-[9px] text-blue-400 italic font-bold leading-tight">* The system automatically changes Dollar to Shilling based on our pharmacy rules ($1=28 SOS)</p>
                            </div>

                            {/* Step 3: Packing */}
                            <div className="space-y-3 p-4 bg-emerald-50/30 rounded-2xl border border-emerald-100">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-600/10 px-2 py-0.5 rounded w-fit">Step 3: Piling & Counting</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Total Boxes</label>
                                        <input type="number" className="input-field" value={formData.boxesBought} onChange={e => setFormData({ ...formData, boxesBought: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Pills in 1 Box</label>
                                        <input type="number" className="input-field" value={formData.unitsPerBox} onChange={e => setFormData({ ...formData, unitsPerBox: e.target.value })} required />
                                    </div>
                                </div>
                                {formData.purchasePricePerBox && formData.unitsPerBox > 0 && (
                                    <div className="mt-2 p-2 bg-white rounded-lg border border-dashed border-emerald-200">
                                        <p className="text-[10px] font-bold text-emerald-700">COST PER PILL: {(formData.purchasePricePerBox / formData.unitsPerBox).toFixed(2)} SOS</p>
                                        <p className="text-[8px] text-slate-400"> (Total Box Price ÷ Pills in Box)</p>
                                    </div>
                                )}
                            </div>

                            {/* Step 4: Selling Price */}
                            <div className="space-y-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded w-fit">Step 4: Your Sales Price</p>

                                {/* Pill Price */}
                                <div className="p-3 bg-white rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black text-emerald-600 mb-2 italic">A: Sale Price for 1 Pill</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input type="number" step="0.01" className="input-field border-primary/30" value={usdInput.selling} onChange={e => handleUsdChange('selling', e.target.value)} placeholder="0.00 $" />
                                        </div>
                                        <div>
                                            <input type="number" className="input-field" value={formData.sellingPricePerUnit} onChange={e => handleSosChange('selling', e.target.value)} required placeholder="SOS" />
                                        </div>
                                    </div>
                                </div>

                                {/* Box Price */}
                                <div className="p-3 bg-white rounded-xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-[10px] font-black text-blue-600 italic">B: Sale Price for Full Box</p>
                                        <button
                                            type="button"
                                            onClick={() => handleSosChange('sellingBox', formData.sellingPricePerUnit * formData.unitsPerBox)}
                                            className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 hover:bg-blue-100"
                                        >
                                            AUTO FILL (PILL × BOX)
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input type="number" step="0.01" className="input-field border-primary/30" value={usdInput.sellingBox} onChange={e => handleUsdChange('sellingBox', e.target.value)} placeholder="0.00 $" />
                                        </div>
                                        <div>
                                            <input type="number" className="input-field" value={formData.sellingPricePerBox} onChange={e => handleSosChange('sellingBox', e.target.value)} required placeholder="SOS" />
                                        </div>
                                    </div>
                                </div>

                                {/* Revenue Guide */}
                                {formData.sellingPricePerUnit > 0 && formData.unitsPerBox > 0 && (
                                    <div className="mt-4 p-3 bg-slate-900 text-white rounded-2xl border-l-4 border-primary">
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Store Revenue Guide</p>
                                        <div className="flex justify-between text-xs font-bold border-b border-white/10 pb-2 mb-2">
                                            <span>Full Box Sale:</span>
                                            <span className="text-blue-400">{formData.sellingPricePerBox || 0} SOS</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span>Sold as {formData.unitsPerBox} Pills:</span>
                                            <span className="text-emerald-400">{formData.sellingPricePerUnit * formData.unitsPerBox} SOS</span>
                                        </div>
                                        <p className="text-[8px] opacity-40 mt-2 font-medium italic">* This shows you the "Right Price" difference.</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-black text-red-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12} /> Expiry Date</label>
                                <input type="date" className="input-field border-red-100" value={formData.expiryDate} onChange={e => setFormData({ ...formData, expiryDate: e.target.value })} required />
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-lg font-black shadow-xl shadow-primary/30 tracking-tighter">
                                {loading ? 'SAVING...' : 'FINISH & ADD STOCK'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-3">
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">Inventory Stock List</h3>
                            <div className="flex gap-2">
                                <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                                    Total Value: {medicines.reduce((acc, m) => acc + (m.totalUnitsInStock * m.sellingPricePerUnit), 0).toLocaleString()} SOS
                                </div>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Medicine</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Supplier</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Buying @ Box</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Selling @ Unit</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Stock (Box/Unit)</th>
                                        <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">Expiry</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {medicines.map(m => (
                                        <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-slate-800">{m.name}</p>
                                                <p className="text-xs text-medical-muted">{m.category || 'General'}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm font-medium">{m.supplier?.name || 'Local Source'}</span>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-sm">
                                                <p>{m.purchasePricePerBox?.toLocaleString() || 0} SOS</p>
                                                <p className="text-[10px] text-primary font-bold">${convertSosToUsd(m.purchasePricePerBox)} USD</p>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold text-primary">
                                                <p>{m.sellingPricePerUnit?.toLocaleString() || 0} SOS</p>
                                                <p className="text-[10px] text-blue-600">${convertSosToUsd(m.sellingPricePerUnit)} USD</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 tracking-tight">{m.boxesInStock} FULL BOXES</span>
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit mt-1 border border-emerald-100">+{m.totalUnitsInStock % m.unitsPerBox} LOOSE PILLS</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${new Date(m.expiryDate) < new Date() ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {new Date(m.expiryDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {medicines.length === 0 && <p className="text-center py-20 text-slate-400">Inventory is empty.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicineRegistration;

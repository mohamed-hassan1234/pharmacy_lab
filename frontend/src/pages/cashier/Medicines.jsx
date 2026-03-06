import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Plus } from 'lucide-react';
import { convertSosToUsd, convertUsdToSos } from '../../utils/currency';

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

    useEffect(() => {
        fetchSuppliers();
        fetchMedicines();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/inventory/suppliers', config);
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMedicines = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/inventory/medicines', config);
            setMedicines(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUsdChange = (type, value) => {
        const usd = Number.parseFloat(value) || 0;
        const sos = convertUsdToSos(usd);
        setUsdInput((prev) => ({ ...prev, [type]: value }));

        if (type === 'purchase') {
            setFormData((prev) => ({ ...prev, purchasePricePerBox: sos }));
        } else if (type === 'selling') {
            setFormData((prev) => ({ ...prev, sellingPricePerUnit: sos }));
        } else {
            setFormData((prev) => ({ ...prev, sellingPricePerBox: sos }));
        }
    };

    const handleSosChange = (type, value) => {
        const sos = Number.parseInt(value, 10) || 0;
        const usd = convertSosToUsd(sos);

        if (type === 'purchase') {
            setFormData((prev) => ({ ...prev, purchasePricePerBox: sos }));
            setUsdInput((prev) => ({ ...prev, purchase: usd }));
        } else if (type === 'selling') {
            setFormData((prev) => ({ ...prev, sellingPricePerUnit: sos }));
            setUsdInput((prev) => ({ ...prev, selling: usd }));
        } else {
            setFormData((prev) => ({ ...prev, sellingPricePerBox: sos }));
            setUsdInput((prev) => ({ ...prev, sellingBox: usd }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('http://localhost:5010/api/inventory/medicines', formData, config);
            setFormData({
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
            setUsdInput({ purchase: '', selling: '', sellingBox: '' });
            fetchMedicines();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    const maxStockUnits = medicines.reduce((max, item) => Math.max(max, Number(item.totalUnitsInStock) || 0), 0);
    const totalInventoryValue = medicines.reduce(
        (acc, med) => acc + ((Number(med.totalUnitsInStock) || 0) * (Number(med.sellingPricePerUnit) || 0)),
        0
    );

    return (
        <div className="page-section animate-in fade-in duration-500">
            <div className="section-header">
                <h2 className="section-title">Medicine Form & Stock Table</h2>
                <p className="section-subtitle">Use your pharmacy data in a clean basic form and striped stock table layout.</p>
            </div>

            <div className="form-template">
                <h3 className="form-template-title">Basic Form Elements</h3>
                <p className="form-template-subtitle">Add medicine details, pricing, quantity, and expiry information.</p>

                <form onSubmit={handleSubmit} className="form-template-row">
                    <div className="form-grid">
                        <div>
                            <label>Medicine name</label>
                            <input
                                type="text"
                                placeholder="Name"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label>Category</label>
                            <input
                                type="text"
                                placeholder="Category"
                                value={formData.category}
                                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label>Supplier</label>
                            <select
                                value={formData.supplierId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
                                required
                            >
                                <option value="">Select supplier</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier._id} value={supplier._id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Expiry date</label>
                            <input
                                type="date"
                                value={formData.expiryDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div>
                            <label>Purchase price per box (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.purchase} onChange={(e) => handleUsdChange('purchase', e.target.value)} />
                        </div>
                        <div>
                            <label>Purchase price per box (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.purchasePricePerBox} onChange={(e) => handleSosChange('purchase', e.target.value)} required />
                        </div>
                        <div>
                            <label>Selling price per unit (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.selling} onChange={(e) => handleUsdChange('selling', e.target.value)} />
                        </div>
                        <div>
                            <label>Selling price per unit (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.sellingPricePerUnit} onChange={(e) => handleSosChange('selling', e.target.value)} required />
                        </div>
                        <div>
                            <label>Selling price per box (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.sellingBox} onChange={(e) => handleUsdChange('sellingBox', e.target.value)} />
                        </div>
                        <div>
                            <label>Selling price per box (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.sellingPricePerBox} onChange={(e) => handleSosChange('sellingBox', e.target.value)} required />
                        </div>
                        <div>
                            <label>Units per box</label>
                            <input
                                type="number"
                                placeholder="Units"
                                value={formData.unitsPerBox}
                                onChange={(e) => setFormData((prev) => ({ ...prev, unitsPerBox: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label>Boxes bought</label>
                            <input
                                type="number"
                                placeholder="Boxes"
                                value={formData.boxesBought}
                                onChange={(e) => setFormData((prev) => ({ ...prev, boxesBought: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary px-6">
                        <Plus size={16} />
                        {loading ? 'Saving...' : 'Add medicine'}
                    </button>
                </form>
            </div>

            <div className="card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="chart-title flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        Striped Table
                    </h3>
                    <p className="text-sm text-slate-500">Total inventory value: {totalInventoryValue.toLocaleString()} SOS</p>
                </div>

                <div className="table-shell">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Medicine</th>
                                <th>Supplier</th>
                                <th>Progress</th>
                                <th>Price (USD)</th>
                                <th>Deadline</th>
                            </tr>
                        </thead>
                        <tbody>
                            {medicines.map((medicine) => {
                                const totalUnits = Number(medicine.totalUnitsInStock) || 0;
                                const percent = maxStockUnits > 0 ? Math.max(4, Math.min(100, Math.round((totalUnits / maxStockUnits) * 100))) : 0;
                                const progressColor = percent < 25 ? '#ef4444' : percent < 50 ? '#f59e0b' : percent < 75 ? '#3b82f6' : '#1cc588';

                                return (
                                    <tr key={medicine._id}>
                                        <td>
                                            <p className="font-semibold text-slate-800">{medicine.name}</p>
                                            <p className="text-xs text-slate-500">{medicine.category || 'General'}</p>
                                        </td>
                                        <td>{medicine.supplier?.name || 'Local Source'}</td>
                                        <td>
                                            <div className="h-2.5 w-full rounded-full bg-slate-200">
                                                <div className="h-2.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: progressColor }} />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {(medicine.boxesInStock || 0).toLocaleString()} boxes / {totalUnits.toLocaleString()} units
                                            </p>
                                        </td>
                                        <td>
                                            <p className="font-semibold text-slate-800">${convertSosToUsd(medicine.sellingPricePerBox || 0)} USD</p>
                                            <p className="text-xs text-slate-500">{(medicine.sellingPricePerBox || 0).toLocaleString()} SOS</p>
                                        </td>
                                        <td>
                                            <span className={`status-chip ${new Date(medicine.expiryDate) < new Date() ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                                                {new Date(medicine.expiryDate).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {medicines.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-10 text-center text-slate-500">Inventory is empty.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MedicineRegistration;



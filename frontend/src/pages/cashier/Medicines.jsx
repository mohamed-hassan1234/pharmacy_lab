import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Plus, Pencil, Trash2, X } from 'lucide-react';
import { convertSosToUsd, convertUsdToSos } from '../../utils/currency';

const emptyForm = {
    name: '',
    category: '',
    supplierId: '',
    purchasePricePerBox: '',
    unitsPerBox: '',
    sellingPricePerUnit: '',
    sellingPricePerBox: '',
    boxesBought: '',
    expiryDate: ''
};

const emptyUsdInput = { purchase: '', selling: '', sellingBox: '' };

const MedicineRegistration = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [usdInput, setUsdInput] = useState(emptyUsdInput);

    useEffect(() => {
        fetchSuppliers();
        fetchMedicines();
    }, []);

    const authConfig = () => ({
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
    });

    const resetForm = () => {
        setEditingMedicine(null);
        setFormData(emptyForm);
        setUsdInput(emptyUsdInput);
    };

    const fetchSuppliers = async () => {
        try {
            const { data } = await axios.get('/api/inventory/suppliers', authConfig());
            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMedicines = async () => {
        try {
            const { data } = await axios.get('/api/inventory/medicines', authConfig());
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
            setFormData((prev) => ({ ...prev, purchasePricePerBox: value }));
            setUsdInput((prev) => ({ ...prev, purchase: usd }));
        } else if (type === 'selling') {
            setFormData((prev) => ({ ...prev, sellingPricePerUnit: value }));
            setUsdInput((prev) => ({ ...prev, selling: usd }));
        } else {
            setFormData((prev) => ({ ...prev, sellingPricePerBox: value }));
            setUsdInput((prev) => ({ ...prev, sellingBox: usd }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingMedicine) {
                await axios.patch(`/api/inventory/medicines/${editingMedicine._id}`, formData, authConfig());
            } else {
                await axios.post('/api/inventory/medicines', formData, authConfig());
            }

            resetForm();
            fetchMedicines();
        } catch (err) {
            alert(err.response?.data?.message || 'Way fashilantay.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (medicine) => {
        setEditingMedicine(medicine);
        setFormData({
            name: medicine.name || '',
            category: medicine.category || '',
            supplierId: medicine.supplier?._id || '',
            purchasePricePerBox: medicine.purchasePricePerBox || '',
            unitsPerBox: medicine.unitsPerBox || '',
            sellingPricePerUnit: medicine.sellingPricePerUnit || '',
            sellingPricePerBox: medicine.sellingPricePerBox || '',
            boxesBought: medicine.boxesInStock || '',
            expiryDate: medicine.expiryDate ? new Date(medicine.expiryDate).toISOString().split('T')[0] : ''
        });
        setUsdInput({
            purchase: convertSosToUsd(medicine.purchasePricePerBox || 0),
            selling: convertSosToUsd(medicine.sellingPricePerUnit || 0),
            sellingBox: convertSosToUsd(medicine.sellingPricePerBox || 0)
        });
    };

    const handleDelete = async (medicine) => {
        if (!window.confirm(`${medicine.name} ma tirtiraysaa?`)) return;

        try {
            await axios.delete(`/api/inventory/medicines/${medicine._id}`, authConfig());
            if (editingMedicine?._id === medicine._id) {
                resetForm();
            }
            fetchMedicines();
        } catch (err) {
            alert(err.response?.data?.message || 'Tirtirka daawadu wuu fashilmay.');
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
                <h2 className="section-title">Foomka Daawada iyo Jadwalka Kaydka</h2>
                <p className="section-subtitle">Ku dar, cusboonaysii, tirtir, oo eeg kaydka daawada adigoo adeegsanaya xogta kaydkaaga dhabta ah.</p>
            </div>

            <div className="form-template">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="form-template-title">{editingMedicine ? 'Cusboonaysii Daawada' : 'Qaybaha Aasaasiga ah ee Foomka'}</h3>
                        <p className="form-template-subtitle">
                            {editingMedicine ? `Waxaad wax ka beddelaysaa ${editingMedicine.name}` : 'Ku dar faahfaahinta daawada, qiimaha, tirada, iyo taariikhda dhicitaanka.'}
                        </p>
                    </div>
                    {editingMedicine && (
                        <button type="button" onClick={resetForm} className="btn-secondary px-4 py-2 text-xs uppercase">
                            <X size={14} /> Jooji Wax-ka-beddelka
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="form-template-row">
                    <div className="form-grid">
                        <div>
                            <label>Magaca daawada</label>
                            <input
                                type="text"
                                placeholder="Magac"
                                value={formData.name}
                                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label>Qaybta</label>
                            <input
                                type="text"
                                placeholder="Qayb"
                                value={formData.category}
                                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label>Alaab-qeybiye</label>
                            <select
                                value={formData.supplierId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, supplierId: e.target.value }))}
                                required
                            >
                                <option value="">Dooro alaab-qeybiye</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier._id} value={supplier._id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label>Taariikhda dhicitaanka</label>
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
                            <label>Qiimaha iibsiga halkii kartoon (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.purchase} onChange={(e) => handleUsdChange('purchase', e.target.value)} />
                        </div>
                        <div>
                            <label>Qiimaha iibsiga halkii kartoon (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.purchasePricePerBox} onChange={(e) => handleSosChange('purchase', e.target.value)} required />
                        </div>
                        <div>
                            <label>Qiimaha iibka halkii xabbo (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.selling} onChange={(e) => handleUsdChange('selling', e.target.value)} />
                        </div>
                        <div>
                            <label>Qiimaha iibka halkii xabbo (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.sellingPricePerUnit} onChange={(e) => handleSosChange('selling', e.target.value)} required />
                        </div>
                        <div>
                            <label>Qiimaha iibka halkii kartoon (USD)</label>
                            <input type="number" step="0.01" placeholder="USD" value={usdInput.sellingBox} onChange={(e) => handleUsdChange('sellingBox', e.target.value)} />
                        </div>
                        <div>
                            <label>Qiimaha iibka halkii kartoon (SOS)</label>
                            <input type="number" placeholder="SOS" value={formData.sellingPricePerBox} onChange={(e) => handleSosChange('sellingBox', e.target.value)} required />
                        </div>
                        <div>
                            <label>Xabbo halkii kartoon</label>
                            <input
                                type="number"
                                placeholder="Xabbo"
                                value={formData.unitsPerBox}
                                onChange={(e) => setFormData((prev) => ({ ...prev, unitsPerBox: e.target.value }))}
                                required
                            />
                        </div>
                        <div>
                            <label>{editingMedicine ? 'Kartoonnada kaydka ku jira' : 'Kartoonnada la iibsaday'}</label>
                            <input
                                type="number"
                                placeholder="Kartoon"
                                value={formData.boxesBought}
                                onChange={(e) => setFormData((prev) => ({ ...prev, boxesBought: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={loading} className="btn-primary px-6">
                            <Plus size={16} />
                            {loading ? 'Waa la keydinayaa...' : (editingMedicine ? 'Cusboonaysii daawada' : 'Ku dar daawo')}
                        </button>
                        {editingMedicine && (
                            <button type="button" onClick={resetForm} className="btn-secondary px-6">
                                Nadiifi
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="chart-title flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        Jadwalka Kaydka
                    </h3>
                    <p className="text-sm text-slate-500">Wadarta qiimaha kaydka: {totalInventoryValue.toLocaleString()} SOS</p>
                </div>

                <div className="table-shell">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Daawo</th>
                                <th>Alaab-qeybiye</th>
                                <th>Heerka Kaydka</th>
                                <th>Qiime (USD)</th>
                                <th>Dhicitaan</th>
                                <th>Falal</th>
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
                                            <p className="text-xs text-slate-500">{medicine.category || 'Guud'}</p>
                                        </td>
                                        <td>{medicine.supplier?.name || 'Isha Deegaanka'}</td>
                                        <td>
                                            <div className="h-2.5 w-full rounded-full bg-slate-200">
                                                <div className="h-2.5 rounded-full" style={{ width: `${percent}%`, backgroundColor: progressColor }} />
                                            </div>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {(medicine.boxesInStock || 0).toLocaleString()} kartoon / {totalUnits.toLocaleString()} xabbo
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
                                        <td>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => handleEdit(medicine)} className="btn-secondary px-3 py-2 text-xs">
                                                    <Pencil size={14} />
                                                </button>
                                                <button type="button" onClick={() => handleDelete(medicine)} className="btn-secondary px-3 py-2 text-xs text-red-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {medicines.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-10 text-center text-slate-500">Kaydku waa madhan yahay.</td>
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

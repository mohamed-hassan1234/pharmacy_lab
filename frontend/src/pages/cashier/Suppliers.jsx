import { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, MapPin, StickyNote, History } from 'lucide-react';

const SupplierManagement = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [formData, setFormData] = useState({ name: '', source: '', note: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/inventory/suppliers', config);
            setSuppliers(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://homecare.nidwa.com/api/inventory/suppliers', formData, config);
            setFormData({ name: '', source: '', note: '' });
            fetchSuppliers();
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="card sticky top-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Plus className="text-primary" />
                        Register New Supplier
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Supplier Name</label>
                            <div className="relative">
                                <Truck className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text" className="input-field pl-10" placeholder="e.g. Somali Pharma"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Source / Place</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text" className="input-field pl-10" placeholder="e.g. Bakara Market"
                                    value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Note (Optional)</label>
                            <div className="relative">
                                <StickyNote className="absolute left-3 top-3 text-slate-400" size={18} />
                                <textarea
                                    className="input-field pl-10 h-24 pt-2" placeholder="Any additional info..."
                                    value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                            {loading ? 'Saving...' : 'Register Supplier'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="card">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <History className="text-primary" />
                        Registered Suppliers
                    </h2>
                    <div className="table-shell">
                        <table className="data-table striped-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Source</th>
                                    <th>Added Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suppliers.map(s => (
                                    <tr key={s._id}>
                                        <td className="px-4 py-4 font-semibold text-slate-800">{s.name}</td>
                                        <td className="px-4 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold uppercase tracking-tight">{s.source}</span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {suppliers.length === 0 && <p className="text-center py-10 text-slate-400">No suppliers registered yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierManagement;


import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Phone, Plus, History, Search } from 'lucide-react';

const CustomerManagement = () => {
    const [customers, setCustomers] = useState([]);
    const [formData, setFormData] = useState({ name: '', phone: '' });
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('http://localhost:5010/api/cashier/customers', config);
            setCustomers(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('http://localhost:5010/api/cashier/customers', formData, config);
            setFormData({ name: '', phone: '' });
            fetchCustomers();
        } catch (err) { alert(err.response?.data?.message || 'Failed'); }
        finally { setLoading(false); }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-1">
                <div className="card sticky top-8">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Plus className="text-primary" />
                        Register New Customer (Clinic/Pharmacy)
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text" className="input-field pl-10" placeholder="e.g. Ahmed Ali"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone Number (SOS/Local)</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                                <input
                                    type="text" className="input-field pl-10" placeholder="e.g. 61xxxxxxx"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                            {loading ? 'Registering...' : 'Add Customer'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="card">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <History className="text-primary" />
                            Customer List
                        </h2>
                        <div className="relative w-full max-w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                className="input-field pl-10 py-1"
                                placeholder="Search customers..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="table-shell">
                        <table className="data-table striped-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Registered On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(c => (
                                    <tr key={c._id}>
                                        <td className="px-4 py-4 font-semibold text-slate-800 uppercase tracking-tighter">{c.name}</td>
                                        <td className="px-4 py-4 font-mono text-slate-600">{c.phone || 'N/A'}</td>
                                        <td className="px-4 py-4 text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredCustomers.length === 0 && <p className="text-center py-10 text-slate-400">No customers found.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerManagement;



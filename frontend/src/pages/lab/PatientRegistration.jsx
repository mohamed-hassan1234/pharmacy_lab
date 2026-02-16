import { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Search, Calendar, Phone, MapPin } from 'lucide-react';

const PatientRegistration = () => {
    const [patients, setPatients] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        sex: 'Male',
        phone: '',
        address: ''
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://homecare.nidwa.com/api/doctor/patients', config);
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://homecare.nidwa.com/api/doctor/patients', formData, config);
            setShowForm(false);
            setFormData({ name: '', age: '', sex: 'Male', phone: '', address: '' });
            fetchPatients();
            alert('Patient registered successfully!');
        } catch (err) { alert(err.response?.data?.message || 'Error registering patient'); }
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="section-title flex items-center gap-3">
                        <Users size={30} className="text-primary" /> Patient Registration
                    </h1>
                    <p className="section-subtitle">Register new patients for laboratory tests.</p>
                </div>
                <button onClick={() => setShowForm(true)} className="btn-primary uppercase tracking-wide">
                    <UserPlus size={20} /> Register Patient
                </button>
            </div>

            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Patient ID or Name..."
                        className="w-full pl-12"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <Users /> Registered Patients ({filtered.length})
                    </h3>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Patient ID</th>
                                <th>Name</th>
                                <th>Age and Sex</th>
                                <th>Contact</th>
                                <th>Registered</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((patient) => (
                                <tr key={patient._id}>
                                    <td className="px-8 py-5">
                                        <span className="font-black text-blue-600 text-sm">{patient.patientId}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{patient.name}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-600">{patient.age} years • {patient.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="space-y-1">
                                            {patient.phone && (
                                                <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                                    <Phone size={12} /> {patient.phone}
                                                </p>
                                            )}
                                            {patient.address && (
                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                                    <MapPin size={12} /> {patient.address}
                                                </p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(patient.createdAt).toLocaleDateString()}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="card w-full max-w-2xl animate-in zoom-in duration-300">
                        <h3 className="text-2xl font-black text-slate-800 mb-5 uppercase tracking-wide flex items-center gap-3">
                            <UserPlus className="text-primary" /> Register New Patient
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-grid">
                                <div className="col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Age *</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sex *</label>
                                    <select
                                        className="input-field"
                                        value={formData.sex}
                                        onChange={e => setFormData({ ...formData, sex: e.target.value })}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="input-field"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Address</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="btn-secondary flex-1 uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 uppercase"
                                >
                                    <UserPlus size={20} /> Register Patient
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PatientRegistration;


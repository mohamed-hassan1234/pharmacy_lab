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
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/doctor/patients', config);
            setPatients(data);
        } catch (err) { console.error(err); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.post('https://lafoole.somsoftsystems.com/api/doctor/patients', formData, config);
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
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                            <Users size={48} className="text-blue-400" /> Patient Registration
                        </h1>
                        <p className="text-blue-300 font-black text-sm uppercase tracking-[.3em]">Register New Patients for Lab Tests</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-blue-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-2xl shadow-blue-500/30 hover:scale-105 transition-transform flex items-center gap-3"
                    >
                        <UserPlus size={24} /> Register Patient
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by Patient ID or Name..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500 font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Patient List */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <Users /> Registered Patients ({filtered.length})
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient ID</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Age & Sex</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((patient) => (
                                <tr key={patient._id} className="hover:bg-slate-50/50 transition-colors">
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

            {/* Registration Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <h3 className="text-3xl font-black text-slate-800 mb-6 uppercase italic flex items-center gap-3">
                            <UserPlus className="text-blue-600" /> Register New Patient
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name *</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-lg"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Age *</label>
                                    <input
                                        type="number"
                                        className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-lg"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sex *</label>
                                    <select
                                        className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-lg"
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
                                        className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Address</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl uppercase shadow-2xl shadow-blue-600/30 flex items-center justify-center gap-2"
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

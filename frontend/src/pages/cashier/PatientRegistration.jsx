import { useState } from 'react';
import axios from 'axios';
import { UserPlus, Search, Phone, MapPin, User, Hash } from 'lucide-react';

const PatientRegistration = () => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        sex: 'Male',
        phone: '',
        address: ''
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
            };
            const { data } = await axios.post('http://localhost:5000/api/doctor/patients', formData, config);
            setSuccess(data);
            setFormData({ name: '', age: '', sex: 'Male', phone: '', address: '' });

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Patient Registration</h2>
                    <p className="text-medical-muted">Add new patients to the clinical queue</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 card">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="input-field pl-10"
                                        placeholder="Patient name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Age</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        className="input-field pl-10"
                                        placeholder="25"
                                        value={formData.age}
                                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Sex</label>
                                <select
                                    className="input-field"
                                    value={formData.sex}
                                    onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="input-field pl-10"
                                        placeholder="+252..."
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={18} />
                                <textarea
                                    className="input-field pl-10 h-24 pt-2"
                                    placeholder="Street details..."
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                ></textarea>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                            {loading ? 'Processing...' : (
                                <>
                                    <UserPlus size={20} />
                                    Register & Generate Queue ID
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    {success && (
                        <div className="card bg-emerald-600 text-white border-none text-center shadow-xl shadow-emerald-600/20">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <UserPlus size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-1">Registered successfully</h3>
                            <p className="opacity-90 text-sm mb-4">{success.name} has been registered.</p>

                            <div className="bg-white/10 rounded-xl p-4 mb-4">
                                <p className="text-xs uppercase font-black opacity-60 italic mb-1">Patient ID</p>
                                <p className="text-2xl font-black italic tracking-tighter">{success.patientId}</p>
                            </div>

                            <button
                                onClick={async () => {
                                    try {
                                        const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
                                        await axios.patch(`https://lafoole.somsoftsystems.com/api/doctor/patients/${success._id}/status`, { visitStatus: 'Waiting for Doctor' }, config);
                                        alert('Patient sent to Doctor queue!');
                                        setSuccess(null);
                                    } catch (err) { alert('Error sending to doctor'); }
                                }}
                                className="w-full bg-white text-emerald-600 font-black py-3 rounded-xl uppercase italic shadow-lg hover:bg-emerald-50 transition-all"
                            >
                                Send to Doctor
                            </button>
                        </div>
                    )}


                    <div className="card">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-700">
                            <Search size={18} />
                            Quick Search
                        </h3>
                        <div className="space-y-3">
                            <input type="text" className="input-field text-sm" placeholder="Search by ID or Name..." />
                            <p className="text-xs text-medical-muted">Enter patient details to retrieve medical history or update records.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PatientRegistration;

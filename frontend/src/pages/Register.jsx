import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Stethoscope, User, Mail, Lock, Briefcase, Eye, EyeOff } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Admin'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post('http://localhost:5010/api/auth/register', formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Isdiiwaangelintu way fashilantay');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 mx-auto mb-6">
                        <Stethoscope size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">Samee Akoon</h1>
                    <p className="text-slate-500 mt-2">Ku soo biir maamulka HealthSync Pro</p>
                </div>

                <div className="bg-white rounded-3xl shadow-premium p-8 border border-slate-100">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Magaca Buuxa</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    className="input-field pl-10"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Cinwaanka Iimaylka</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    className="input-field pl-10"
                                    placeholder="name@clinic.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Doorka</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <select
                                    className="input-field pl-10 appearance-none"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="Admin">Maamule</option>
                                    <option value="Cashier">Qasnaji</option>
                                    <option value="Doctor">Dhakhtar</option>
                                    <option value="Lab Technician">Farsamo-yaqaan Shaybaar</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Furaha Sirta</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full py-3 text-lg mt-4 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                'Isdiiwaangeli'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-500 mt-6">
                        Akoon hore ma u leedahay?{' '}
                        <Link to="/login" className="text-primary font-bold hover:underline">
                            Soo Gal
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;



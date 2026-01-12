import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Lock, Mail, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('admin@clinic.com');
    const [password, setPassword] = useState('password123');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const user = await login(email, password);
            // Redirect based on role
            const routes = {
                'Admin': '/admin',
                'Cashier': '/cashier/register',
                'Doctor': '/doctor',
                'Lab Technician': '/lab'
            };
            navigate(routes[user.role] || '/');
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30 mx-auto mb-6">
                        <Stethoscope size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">HealthSync Pro</h1>
                    <p className="text-slate-500 mt-2">Clinic & Pharmacy Management System</p>
                </div>

                <div className="bg-white rounded-3xl shadow-premium p-8 border border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Sign In</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    className="input-field pl-10"
                                    placeholder="admin@clinic.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input-field pl-10 pr-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                            className="btn-primary w-full py-3 text-lg mt-2 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                'Log In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                        <p className="text-center text-sm text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary font-bold hover:underline">Register</Link>
                        </p>
                        <p className="text-center text-sm text-slate-500">
                            Demo access: <span className="font-semibold text-primary">admin@clinic.com / password123</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

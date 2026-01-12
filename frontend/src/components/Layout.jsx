import { Outlet, Navigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { User } from 'lucide-react';

const Layout = () => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-medical-bg">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="flex min-h-screen bg-medical-bg">
            <Sidebar />
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user.name}</h1>
                        <p className="text-medical-muted">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-4">
                        <Link
                            to="/profile"
                            className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 hover:shadow-md transition-all font-bold text-slate-700 hover:text-primary"
                        >
                            <User size={20} />
                            <span className="text-sm uppercase tracking-wider">My Profile</span>
                        </Link>
                        <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">System Online</span>
                        </div>
                    </div>
                </header>
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;

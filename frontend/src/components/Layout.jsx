import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIHelpAgent from './AIHelpAgent';
import { useAuth } from '../context/AuthContext';
import { Bell, CalendarDays, ChevronDown, Menu, Search, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const Layout = () => {
    const { user, loading, viewMode, setViewMode } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const formattedDate = useMemo(
        () =>
            new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }),
        []
    );

    useEffect(() => {
        if (!user) return;

        const isLabRoute = location.pathname.startsWith('/lab');
        const mustBeLabMode = user.role === 'Lab Technician' || isLabRoute;

        if (mustBeLabMode && viewMode !== 'laboratory') {
            setViewMode('laboratory');
            localStorage.setItem('clinic_view_mode', 'laboratory');
        }
    }, [location.pathname, setViewMode, user, viewMode]);

    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-medical-bg">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!user) return <Navigate to="/login" />;

    return (
        <div className="app-shell">
            {sidebarOpen && <button className="app-overlay" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="app-main">
                <header className="app-topbar">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <button
                            type="button"
                            className="btn-secondary px-3 py-2 lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="topbar-search">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search patients, medicines, invoices..."
                                className="w-full border-none bg-transparent p-0 text-sm font-medium text-slate-700 focus:ring-0"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="topbar-chip hidden sm:inline-flex">
                            <CalendarDays size={14} />
                            <span>{formattedDate}</span>
                        </div>
                        <div className="topbar-chip hidden md:inline-flex">
                            <span>1 Month</span>
                            <ChevronDown size={14} />
                        </div>
                        <button type="button" className="topbar-chip px-2.5" aria-label="Notifications">
                            <Bell size={15} />
                        </button>
                        <Link to="/profile" className="topbar-chip">
                            <User size={14} />
                            <span className="max-w-28 truncate text-xs font-semibold">{user?.name}</span>
                        </Link>
                    </div>
                </header>

                <section className="app-content">
                    <Outlet />
                </section>

                <AIHelpAgent />
            </main>
        </div>
    );
};

export default Layout;

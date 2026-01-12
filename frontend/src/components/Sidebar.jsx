import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Stethoscope,
    FlaskConical,
    LogOut,
    TrendingUp,
    Truck,
    CreditCard,
    FileBarChart,
    ArrowRightLeft,
    Clock,
    CheckCircle,
    UserPlus
} from 'lucide-react';


import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
    const { user, logout, viewMode, toggleViewMode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const pharmacyMenu = {
        Admin: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
            { name: 'Financials', icon: TrendingUp, path: '/admin/finance' },
            { name: 'Staff', icon: Users, path: '/admin/staff' },
            { name: 'Inventory', icon: Package, path: '/admin/inventory' },
        ],
        Cashier: [
            { name: 'Dashboard', icon: LayoutDashboard, path: '/cashier' },
            { name: 'Register Patient', icon: UserPlus, path: '/cashier/register' },
            { name: 'POS (Sales)', icon: ShoppingCart, path: '/cashier/sales' },
            { name: 'Medicines', icon: Package, path: '/cashier/medicines' },
            { name: 'Customers', icon: Users, path: '/cashier/customers' },
            { name: 'Suppliers', icon: Truck, path: '/cashier/suppliers' },
            { name: 'Reports', icon: FileBarChart, path: '/cashier/reports' },
        ],



        Doctor: [
            { name: 'Patients', icon: Users, path: '/doctor' },
            { name: 'Consultation', icon: Stethoscope, path: '/doctor/consult' },
        ],
    };

    const labMenu = [
        { name: 'Lab Dashboard', icon: LayoutDashboard, path: '/lab' },
        { name: 'Process Payments', icon: CreditCard, path: '/cashier/lab-payments' },
        { name: 'Enter Results', icon: FlaskConical, path: '/lab/tests?status=Paid' },
        { name: 'Awaiting Doctor', icon: Clock, path: '/lab/tests?status=Results Entered' },
        { name: 'Reviewed / Final', icon: CheckCircle, path: '/lab/tests?status=Completed' },

        { name: 'Lab Reports', icon: FileBarChart, path: '/lab/tests' },
    ];



    const currentItems = viewMode === 'pharmacy' ? (pharmacyMenu[user?.role] || []) : labMenu;

    return (
        <div className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0 shadow-sm">
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${viewMode === 'pharmacy' ? 'bg-primary' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                        {viewMode === 'pharmacy' ? <Stethoscope size={24} /> : <FlaskConical size={24} />}
                    </div>
                    <span className="font-bold text-xl tracking-tight text-slate-800">
                        {viewMode === 'pharmacy' ? 'PHARMA' : 'LAB'}
                    </span>
                </div>
            </div>

            <div className="flex-1 px-4 space-y-1 mt-4">
                {currentItems.map((item) => {
                    const isActive = location.pathname === item.path.split('?')[0];

                    return (
                        <div
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={isActive ? (viewMode === 'pharmacy' ? 'sidebar-item-active' : 'flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-600 text-white shadow-lg') : 'sidebar-item'}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </div>
                    );
                })}

                {/* Toggle Mode Button for Cashier & Admin */}
                {(user?.role === 'Cashier' || user?.role === 'Admin') && (
                    <button
                        onClick={toggleViewMode}
                        className={`w-full mt-6 flex flex-col items-center gap-2 p-4 rounded-[2rem] border-2 border-dashed transition-all group ${viewMode === 'pharmacy'
                            ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <ArrowRightLeft size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-black text-xs uppercase tracking-widest leading-none">
                                Switch Dashboard
                            </span>
                        </div>
                        <p className="text-[10px] font-bold opacity-60 uppercase italic">
                            Go to {viewMode === 'pharmacy' ? 'LABORATORY' : 'PHARMACY'}
                        </p>
                    </button>
                )}

            </div>

            <div className="p-4 border-t border-slate-50">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                    <div className={`w-10 h-10 rounded-full ${viewMode === 'pharmacy' ? 'bg-primary/20 text-primary' : 'bg-blue-100 text-blue-600'} flex items-center justify-center font-bold`}>
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="font-semibold text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-medical-muted uppercase font-bold tracking-tighter">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="sidebar-item w-full text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;

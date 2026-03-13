import { useLocation, useNavigate } from 'react-router-dom';
import {
    ArrowRightLeft,
    CheckCircle,
    Clock,
    CreditCard,
    FileBarChart,
    FlaskConical,
    LayoutDashboard,
    LogOut,
    Package,
    ShoppingCart,
    Stethoscope,
    Truck,
    UserPlus,
    Users,
    X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout, viewMode, toggleViewMode } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const roleLabel = {
        Admin: 'Maamule',
        Cashier: 'Qasnaji',
        Doctor: 'Dhakhtar',
        'Lab Technician': 'Farsamo-yaqaan Shaybaar'
    };

    const pharmacySections = {
        Admin: [
            {
                label: 'Main',
                items: [{ name: 'Guddi', icon: LayoutDashboard, path: '/admin' }]
            },
            {
                label: 'Maamul',
                items: [
                    { name: 'Warbixino', icon: FileBarChart, path: '/admin/reports' }
                ]
            }
        ],
        Cashier: [
            {
                label: 'Ugu Muhiimsan',
                items: [
                    { name: 'Guddi', icon: LayoutDashboard, path: '/cashier' },
                    { name: 'Diiwaangeli Bukaan', icon: UserPlus, path: '/cashier/register' },
                    { name: 'Iibka POS', icon: ShoppingCart, path: '/cashier/sales' }
                ]
            },
            {
                label: 'Hawlgal',
                items: [
                    { name: 'Qoraallada Dhakhtarka', icon: Stethoscope, path: '/cashier/consultations' },
                    { name: 'Daawooyin', icon: Package, path: '/cashier/medicines' },
                    { name: 'Macaamiil', icon: Users, path: '/cashier/customers' },
                    { name: 'Alaab-qeybiyeyaasha', icon: Truck, path: '/cashier/suppliers' },
                    { name: 'Warbixino', icon: FileBarChart, path: '/cashier/reports' }
                ]
            }
        ],
        Doctor: [
            {
                label: 'Ugu Muhiimsan',
                items: [
                    { name: 'Bukaanno', icon: Users, path: '/doctor' },
                    { name: 'La-talin', icon: Stethoscope, path: '/doctor/consult' }
                ]
            }
        ]
    };

    const labSections = [
        {
            label: 'Shaybaar',
            items: [
                { name: 'Guddi Shaybaar', icon: LayoutDashboard, path: '/lab' },
                { name: 'Habee Lacag-bixin', icon: CreditCard, path: '/cashier/lab-payments' },
                { name: 'Qoraallada Dhakhtarka', icon: Stethoscope, path: '/cashier/consultations' },
                { name: 'Geli Natiijo', icon: FlaskConical, path: '/lab/tests?status=Paid' },
                { name: 'Dhakhtar Sugaya', icon: Clock, path: '/lab/tests?status=Awaiting Doctor' },
                { name: 'La Dhammeeyey', icon: CheckCircle, path: '/lab/tests?status=Completed' },
                { name: 'Warbixin Shaybaar', icon: FileBarChart, path: '/lab/tests' }
            ]
        }
    ];

    const currentSections = viewMode === 'pharmacy' ? (pharmacySections[user?.role] || []) : labSections;

    const isItemActive = (path) => {
        const [pathname, query] = path.split('?');
        if (location.pathname !== pathname) return false;
        if (!query) return true;
        return location.search.replace('?', '') === query;
    };

    const goTo = (path) => {
        navigate(path);
        onClose?.();
    };

    const handleDashboardSwitch = () => {
        const nextMode = viewMode === 'pharmacy' ? 'laboratory' : 'pharmacy';
        toggleViewMode();

        if (nextMode === 'laboratory') {
            goTo('/lab');
            return;
        }

        if (user?.role === 'Cashier') {
            goTo('/cashier/medicines');
            return;
        }

        if (user?.role === 'Admin') {
            goTo('/admin');
            return;
        }

        goTo('/');
    };

    return (
        <aside className={`app-sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            <div className="app-sidebar-brand">
                <div className="flex items-center gap-3">
                    <div className="app-sidebar-brand-badge">
                        {viewMode === 'pharmacy' ? <Stethoscope size={22} /> : <FlaskConical size={22} />}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100">DR. SAALIM</p>
                        <p className="text-lg font-bold text-green-200">{viewMode === 'pharmacy' ? 'Rugta Caafimaadka' : 'Qaybta Shaybaarka'}</p>
                    </div>
                </div>
                <button type="button" className="btn-secondary px-2.5 py-2 lg:hidden" onClick={onClose} aria-label="Xir menu-ga">
                    <X size={16} />
                </button>
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto py-2">
                {currentSections.map((section) => (
                    <div className="app-sidebar-section" key={section.label}>
                        <p className="app-sidebar-label">{section.label}</p>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = isItemActive(item.path);
                                return (
                                    <button
                                        type="button"
                                        key={item.path}
                                        onClick={() => goTo(item.path)}
                                        className={isActive ? 'sidebar-item-active w-full' : 'sidebar-item w-full'}
                                    >
                                        <item.icon size={18} />
                                        <span className="truncate">{item.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {(user?.role === 'Cashier' || user?.role === 'Admin') && (
                    <div className="app-sidebar-section">
                        <p className="app-sidebar-label">Qalab</p>
                        <button
                            onClick={handleDashboardSwitch}
                            className={`w-full rounded-xl border border-dashed px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide transition-colors ${viewMode === 'pharmacy'
                                ? 'border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20'
                                : 'border-primary/40 bg-primary/10 text-primary-light hover:bg-primary/20'
                                }`}
                        >
                            <div className="mb-1 flex items-center gap-2">
                                <ArrowRightLeft size={14} />
                                <span>Beddel Guddi</span>
                            </div>
                            <span className="text-[11px] normal-case tracking-normal">
                                U gudub {viewMode === 'pharmacy' ? 'muuqaalka shaybaarka' : 'muuqaalka farmashiyaha'}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <div className="border-t border-sidebar-border p-4">
                <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${viewMode === 'pharmacy' ? 'bg-primary/20 text-primary-light' : 'bg-sky-500/20 text-sky-200'}`}>
                        {user?.name?.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{roleLabel[user?.role] || user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="btn-secondary w-full justify-start border-0 bg-red-500/15 text-red-200 hover:bg-red-500/25"
                >
                    <LogOut size={16} />
                    <span>Ka Bax</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;

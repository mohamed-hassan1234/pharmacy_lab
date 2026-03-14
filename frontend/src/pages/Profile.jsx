import { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Mail, Lock, Trash2, Save, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('/api/profile/me', config);
            setUser(data);
            setFormData({ name: data.name, email: data.email });
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch('/api/profile/me', formData, config);
            setEditMode(false);
            fetchProfile();
            alert('Akoonka si guul leh ayaa loo cusboonaysiiyey!');
        } catch (err) { alert(err.response?.data?.message || 'Cilad ayaa ka dhacday cusboonaysiinta koontada'); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return alert('Furayaasha cusub isma waafaqsana!');
        }
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch('/api/profile/me/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, config);
            setShowPasswordChange(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            alert('Furaha sirta si guul leh ayaa loo beddelay!');
        } catch (err) { alert(err.response?.data?.message || 'Cilad ayaa ka dhacday beddelka furaha sirta'); }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword) return alert('Fadlan geli furaha sirta');
        if (!confirm('Ma hubtaa? Ficilkan dib looma celin karo!')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.delete('/api/profile/me', { data: { password: deletePassword }, ...config });
            localStorage.removeItem('clinic_user');
            navigate('/login');
        } catch (err) { alert(err.response?.data?.message || 'Cilad ayaa ka dhacday tirtirka koontada'); }
    };

    const handleLogout = () => {
        localStorage.removeItem('clinic_user');
        navigate('/login');
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="relative z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                            <User size={48} className="text-primary" /> Akoonkayga
                        </h1>
                        <p className="text-primary font-black text-sm uppercase tracking-[.3em]">Maamul Dejimaha Akoonkaaga</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wider shadow-2xl hover:scale-105 transition-transform flex items-center gap-3"
                    >
                        <LogOut size={24} /> Ka Bax
                    </button>
                </div>
            </div>

            {/* Profile Information */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-10">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                        <User size={48} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user?.name}</h2>
                        <p className="text-slate-400 font-bold">{user?.email}</p>
                        <div className="flex gap-2 mt-2">
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-2">
                                <Shield size={14} /> {user?.role}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${user?.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {user?.status}
                            </span>
                        </div>
                    </div>
                </div>

                {!editMode ? (
                    <div className="space-y-4">
                        <div className="p-6 bg-slate-50 rounded-2xl">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Magaca Buuxa</p>
                            <p className="text-lg font-black text-slate-800">{user?.name}</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cinwaanka Iimaylka</p>
                            <p className="text-lg font-black text-slate-800">{user?.email}</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Taariikhda La Sameeyey</p>
                            <p className="text-lg font-black text-slate-800">{new Date(user?.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                            onClick={() => setEditMode(true)}
                            className="w-full bg-primary text-white font-black py-4 rounded-2xl uppercase tracking-wider shadow-xl hover:scale-[1.02] transition-transform"
                        >
                            Wax Ka Beddel Akoonka
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Magaca Buuxa</label>
                            <input
                                type="text"
                                className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-lg"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Cinwaanka Iimaylka</label>
                            <input
                                type="email"
                                className="w-full bg-slate-100 border-none rounded-2xl p-4 font-bold text-lg"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setEditMode(false)}
                                className="flex-1 bg-slate-100 text-slate-600 font-black py-4 rounded-2xl uppercase"
                            >
                                Jooji
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-primary text-white font-black py-4 rounded-2xl uppercase shadow-xl flex items-center justify-center gap-2"
                            >
                                <Save size={20} /> Keydi Isbeddellada
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Security Section */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 p-10">
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <Lock className="text-primary" /> Dejimaha Amniga
                </h3>
                <div className="space-y-4">
                    <button
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className="w-full bg-blue-50 text-blue-600 font-black py-4 rounded-2xl uppercase tracking-wider border-2 border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                        Beddel Furaha Sirta
                    </button>

                    {showPasswordChange && (
                        <form onSubmit={handleChangePassword} className="space-y-4 p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Furaha Hadda</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border-none rounded-2xl p-4 font-bold"
                                    value={passwordData.currentPassword}
                                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Furaha Cusub</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border-none rounded-2xl p-4 font-bold"
                                    value={passwordData.newPassword}
                                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Xaqiiji Furaha Cusub</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border-none rounded-2xl p-4 font-bold"
                                    value={passwordData.confirmPassword}
                                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase shadow-xl"
                            >
                                Cusboonaysii Furaha
                            </button>
                        </form>
                    )}

                    <button
                        onClick={() => setShowDeleteAccount(!showDeleteAccount)}
                        className="w-full bg-red-50 text-red-600 font-black py-4 rounded-2xl uppercase tracking-wider border-2 border-red-100 hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={20} /> Tirtir Akoonka
                    </button>

                    {showDeleteAccount && (
                        <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-100 space-y-4">
                            <p className="text-sm font-bold text-red-600">Digniin: Ficilkani waa joogto mana la laaban karo!</p>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Geli Furahaaga Si Aad U Xaqiijiso</label>
                                <input
                                    type="password"
                                    className="w-full bg-white border-none rounded-2xl p-4 font-bold"
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleDeleteAccount}
                                className="w-full bg-red-600 text-white font-black py-4 rounded-2xl uppercase shadow-xl"
                            >
                                Si Joogto Ah U Tirtir Akoonka
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;



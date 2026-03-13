import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const VIEW_MODE_KEY = 'clinic_view_mode';

const resolveViewModeForRole = (role, savedMode) => {
    if (role === 'Lab Technician') return 'laboratory';
    if (savedMode === 'pharmacy' || savedMode === 'laboratory') return savedMode;
    return 'pharmacy';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('pharmacy'); // 'pharmacy' or 'laboratory'

    useEffect(() => {
        const savedUser = localStorage.getItem('clinic_user');
        const savedMode = localStorage.getItem(VIEW_MODE_KEY);

        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            setViewMode(resolveViewModeForRole(parsedUser?.role, savedMode));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post('http://localhost:5010/api/auth/login', { email, password });
            setUser(data);
            localStorage.setItem('clinic_user', JSON.stringify(data));
            const nextMode = resolveViewModeForRole(data?.role, localStorage.getItem(VIEW_MODE_KEY));
            setViewMode(nextMode);
            localStorage.setItem(VIEW_MODE_KEY, nextMode);
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Gelitaanku wuu fashilmay';
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('clinic_user');
        localStorage.removeItem(VIEW_MODE_KEY);
        setViewMode('pharmacy');
    };

    const toggleViewMode = () => {
        setViewMode(prev => {
            const next = prev === 'pharmacy' ? 'laboratory' : 'pharmacy';
            localStorage.setItem(VIEW_MODE_KEY, next);
            return next;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, viewMode, setViewMode, toggleViewMode }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);



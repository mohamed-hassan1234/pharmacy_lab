import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('pharmacy'); // 'pharmacy' or 'laboratory'

    useEffect(() => {
        const savedUser = localStorage.getItem('clinic_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const { data } = await axios.post('https://lafoole.somsoftsystems.com/api/auth/login', { email, password });
            setUser(data);
            localStorage.setItem('clinic_user', JSON.stringify(data));
            return data;
        } catch (error) {
            throw error.response?.data?.message || 'Login failed';
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('clinic_user');
    };

    const toggleViewMode = () => {
        setViewMode(prev => prev === 'pharmacy' ? 'laboratory' : 'pharmacy');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading, viewMode, setViewMode, toggleViewMode }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

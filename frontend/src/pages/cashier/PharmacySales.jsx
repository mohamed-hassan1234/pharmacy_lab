import { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Plus, Trash2, Search, DollarSign } from 'lucide-react';

const PharmacySales = () => {
    const [medicines, setMedicines] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [saleSuccess, setSaleSuccess] = useState(null);

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
            };
            const { data } = await axios.get('http://localhost:5000/api/inventory', config);
            setMedicines(data);
        } catch (err) {
            console.error(err);
        }
    };

    const addToCart = (med) => {
        const existing = cart.find(item => item.medicineId === med._id);
        if (existing) {
            setCart(cart.map(item => item.medicineId === med._id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { medicineId: med._id, name: med.name, price: med.sellingPrice, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.medicineId !== id));
    };

    const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const processSale = async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` }
            };
            const { data } = await axios.post('https://lafoole.somsoftsystems.com/api/cashier/sales', {
                items: cart,
                paymentMethod: 'Cash'
            }, config);
            setSaleSuccess(data);
            setCart([]);
            fetchMedicines(); // Refresh stock
        } catch (err) {
            alert(err.response?.data?.message || 'Sale failed');
        } finally {
            setLoading(false);
        }
    };

    const filteredMedicines = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
                <div className="card">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Search medicines by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMedicines.map(med => (
                            <div key={med._id} className="p-4 border border-slate-100 rounded-xl hover:border-primary/50 transition-all group flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold">{med.name}</h4>
                                    <p className="text-sm text-medical-muted">${med.sellingPrice} • {med.stock} in stock</p>
                                </div>
                                <button
                                    onClick={() => addToCart(med)}
                                    disabled={med.stock <= 0}
                                    className="w-10 h-10 bg-slate-100 group-hover:bg-primary group-hover:text-white rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="card flex flex-col h-[600px]">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <ShoppingCart size={24} className="text-primary" />
                        Current Sale
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                        {cart.length === 0 ? (
                            <div className="text-center py-20 text-medical-muted">
                                <ShoppingCart size={48} className="mx-auto opacity-20 mb-4" />
                                <p>Cart is empty</p>
                            </div>
                        ) : cart.map(item => (
                            <div key={item.medicineId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                <div>
                                    <p className="font-semibold text-sm">{item.name}</p>
                                    <p className="text-xs text-medical-muted">{item.quantity} x ${item.price}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold">${item.quantity * item.price}</span>
                                    <button onClick={() => removeFromCart(item.medicineId)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-center text-lg">
                            <span className="font-medium text-slate-500">Total Amount</span>
                            <span className="font-bold text-2xl text-primary">${calculateTotal()}</span>
                        </div>
                        <button
                            onClick={processSale}
                            disabled={cart.length === 0 || loading}
                            className="btn-primary w-full py-4 text-lg font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Processing...' : (
                                <>
                                    <DollarSign size={20} />
                                    Complete Sale (SOS)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {saleSuccess && (
                    <div className="card bg-green-50 border-green-200 animate-in zoom-in duration-300">
                        <p className="text-green-800 font-bold mb-2">Sale Completed!</p>
                        <p className="text-xs text-green-700">Receipt ID: <span className="font-mono">{saleSuccess.saleId}</span></p>
                        <button
                            onClick={() => window.print()}
                            className="mt-4 text-sm font-semibold text-primary underline"
                        >
                            Print Receipt
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PharmacySales;

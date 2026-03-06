import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CreditCard, CheckCircle, Clock, FlaskConical, X } from 'lucide-react';

const LabPayments = () => {
    const [requests, setRequests] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [amount, setAmount] = useState('');

    useEffect(() => {
        fetchPendingPayments();
    }, []);

    const fetchPendingPayments = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            // Fetch all requests and filter for 'Awaiting Payment'
            const { data } = await axios.get('http://localhost:5010/api/lab/requests', config);
            setRequests(data.filter(r => r.status === 'Awaiting Payment'));
        } catch (err) { console.error(err); }
    };

    const handleConfirmPayment = async () => {
        if (!amount || isNaN(amount)) return alert('Please enter a valid amount');
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            await axios.patch(`http://localhost:5010/api/lab/requests/${selectedRequest._id}/pay`, { amount: Number(amount) }, config);
            alert('Payment confirmed successfully!');
            setSelectedRequest(null);
            setAmount('');
            fetchPendingPayments();
        } catch (err) { alert(err.response?.data?.message || 'Error confirming payment'); }
    };

    const filtered = requests.filter(r =>
        r.patientName.toLowerCase().includes(search.toLowerCase()) ||
        r.ticketNumber.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-section animate-in fade-in duration-700">
            <div className="section-header">
                <h1 className="section-title flex items-center gap-3">
                    <CreditCard size={30} className="text-primary" /> Lab Payments
                </h1>
                <p className="section-subtitle">Confirm payments for ordered laboratory tests.</p>
            </div>

            <div className="card">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by ticket or patient name..."
                        className="input-field pl-12"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card p-0 overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50 p-6">
                    <div className="pb-4">
                        <h3 className="text-xl font-black flex items-center gap-3 uppercase">
                            <Clock className="text-amber-500" /> Awaiting Payment ({filtered.length})
                        </h3>
                    </div>
                </div>
                <div className="table-shell rounded-none border-0">
                    <table className="data-table striped-table">
                        <thead>
                            <tr>
                                <th>Ticket</th>
                                <th>Patient</th>
                                <th>Tests</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                                        No pending payments found
                                    </td>
                                </tr>
                            ) : filtered.map((req) => (
                                <tr key={req._id}>
                                    <td className="px-8 py-5 font-black text-blue-600">{req.ticketNumber}</td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800 uppercase">{req.patientName}</p>
                                        <p className="text-xs text-slate-400 font-bold tracking-widest">{req.age}Y • {req.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            {req.requestedTests.hematology && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded uppercase">Hematology</span>}
                                            {req.requestedTests.biochemistry && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded uppercase">Biochemistry</span>}
                                            {req.requestedTests.serology && <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-black rounded uppercase">Serology</span>}
                                            {req.requestedTests.urinalysis && <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded uppercase">Urinalysis</span>}
                                            {req.requestedTests.stoolExamination && <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase">Stool</span>}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => setSelectedRequest(req)}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                                        >
                                            <CreditCard size={16} /> Confirm Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRequest && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic leading-none">Confirm Payment</h3>
                                <p className="text-slate-400 font-bold uppercase text-xs mt-2 tracking-widest">{selectedRequest.ticketNumber}</p>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-3xl mb-8 border-2 border-slate-100">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Patient Name</p>
                            <p className="text-xl font-black text-slate-800 uppercase mb-4">{selectedRequest.patientName}</p>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordered Tests</p>
                                    <p className="text-sm font-bold text-slate-600">
                                        {Object.entries(selectedRequest.requestedTests)
                                            .filter(([_, value]) => value === true)
                                            .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1))
                                            .join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Total Amount (In Shillings)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-2xl font-black text-slate-800 focus:border-blue-500 focus:ring-0 transition-all outline-none"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleConfirmPayment}
                                className="w-full bg-blue-600 text-white font-black py-6 rounded-3xl uppercase italic shadow-2xl shadow-blue-600/40 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                <CheckCircle size={24} /> Confirm & Mark as Paid
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LabPayments;



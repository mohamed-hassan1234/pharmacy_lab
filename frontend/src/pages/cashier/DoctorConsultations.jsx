import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, FileText, Pill, Stethoscope, User, Calendar, CheckCircle, Eye } from 'lucide-react';

const DoctorConsultations = () => {
    const [consultations, setConsultations] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedConsultation, setSelectedConsultation] = useState(null);

    useEffect(() => {
        fetchCompletedConsultations();
        // Auto-refresh every 10 seconds
        const interval = setInterval(fetchCompletedConsultations, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchCompletedConsultations = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('clinic_user')).token}` } };
            const { data } = await axios.get('https://lafoole.somsoftsystems.com/api/lab/requests', config);
            // Filter for completed consultations with doctor's diagnosis
            const completed = data.filter(r => r.status === 'Completed' && r.doctorConclusion);
            setConsultations(completed);
        } catch (err) { console.error(err); }
    };

    const filtered = consultations.filter(c =>
        c.patientName.toLowerCase().includes(search.toLowerCase()) ||
        c.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
        c.doctorConclusion?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-5xl font-black text-white tracking-tighter mb-2 uppercase italic flex items-center gap-4">
                        <Stethoscope size={48} className="text-emerald-400" /> Doctor Consultations
                    </h1>
                    <p className="text-emerald-300 font-black text-sm uppercase tracking-[.3em]">View Diagnosis & Prescribed Medicines</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                            <FileText className="text-emerald-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-emerald-600">{consultations.length}</h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Consultations</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Completed by doctors</p>
                </div>

                <div className="bg-white border-2 border-blue-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <Pill className="text-blue-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-blue-600">
                                {consultations.reduce((sum, c) => sum + (c.medicines?.length || 0), 0)}
                            </h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Medicines Prescribed</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Ready for pharmacy</p>
                </div>

                <div className="bg-white border-2 border-purple-100 p-8 rounded-[2.5rem] shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <User className="text-purple-600" size={32} />
                        </div>
                        <div>
                            <h4 className="text-3xl font-black text-purple-600">
                                {new Set(consultations.map(c => c.patientName)).size}
                            </h4>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Unique Patients</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">Treated today</p>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by patient, ticket, or diagnosis..."
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Consultations List */}
            <div className="bg-white rounded-[2.5rem] shadow-lg border border-slate-100 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                    <h3 className="text-xl font-black flex items-center gap-3">
                        <FileText /> Completed Consultations ({filtered.length})
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase">Auto-refreshes every 10 seconds</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnosis</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicines</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest">
                                        No consultations found
                                    </td>
                                </tr>
                            ) : filtered.map((consultation) => (
                                <tr key={consultation._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <span className="font-black text-emerald-600">{consultation.ticketNumber}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800">{consultation.patientName}</p>
                                        <p className="text-xs text-slate-400 font-bold">{consultation.age}y • {consultation.sex}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-600">{consultation.doctorName}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-700 line-clamp-2 max-w-xs">
                                            {consultation.doctorConclusion}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <Pill size={16} className="text-blue-600" />
                                            <span className="font-black text-blue-600">
                                                {consultation.medicines?.length || 0} Item{consultation.medicines?.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <Calendar size={12} /> {new Date(consultation.doctorConclusionAt || consultation.updatedAt).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <button
                                            onClick={() => setSelectedConsultation(consultation)}
                                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-black text-xs uppercase flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
                                        >
                                            <Eye size={16} /> View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Consultation Details Modal */}
            {selectedConsultation && (
                <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-800 uppercase italic">Consultation Details</h3>
                                <p className="text-slate-600 font-bold">{selectedConsultation.patientName} • {selectedConsultation.ticketNumber}</p>
                            </div>
                            <button onClick={() => setSelectedConsultation(null)} className="px-6 py-3 bg-slate-100 rounded-2xl font-black uppercase hover:bg-slate-200">
                                Close
                            </button>
                        </div>

                        {/* Patient Info */}
                        <div className="bg-blue-50 p-6 rounded-2xl mb-6 border-2 border-blue-100">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Patient</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.patientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Age & Sex</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.age} years • {selectedConsultation.sex}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Doctor</p>
                                    <p className="font-black text-slate-800">{selectedConsultation.doctorName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase">Date</p>
                                    <p className="font-black text-slate-800">{new Date(selectedConsultation.doctorConclusionAt || selectedConsultation.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Diagnosis */}
                        <div className="bg-yellow-50 p-8 rounded-[2rem] mb-6 border-2 border-yellow-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center">
                                    <Stethoscope className="text-yellow-700" size={24} />
                                </div>
                                <h4 className="text-xl font-black text-yellow-900 uppercase">Diagnosis (Disease)</h4>
                            </div>
                            <p className="text-lg font-bold text-yellow-900 leading-relaxed">
                                {selectedConsultation.doctorConclusion}
                            </p>
                        </div>

                        {/* Physical Examination */}
                        {selectedConsultation.physicalExamination && (
                            <div className="bg-purple-50 p-8 rounded-[2rem] mb-6 border-2 border-purple-200">
                                <h4 className="text-lg font-black text-purple-900 mb-4 uppercase">Physical Examination Notes</h4>
                                <p className="text-purple-900 font-bold leading-relaxed whitespace-pre-wrap">
                                    {selectedConsultation.physicalExamination}
                                </p>
                            </div>
                        )}

                        {/* Prescribed Medicines */}
                        <div className="bg-emerald-50 p-8 rounded-[2rem] border-2 border-emerald-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-emerald-200 rounded-xl flex items-center justify-center">
                                    <Pill className="text-emerald-700" size={24} />
                                </div>
                                <h4 className="text-xl font-black text-emerald-900 uppercase">Prescribed Medicines</h4>
                            </div>
                            {selectedConsultation.medicines && selectedConsultation.medicines.length > 0 ? (
                                <div className="space-y-4">
                                    {selectedConsultation.medicines.map((med, index) => (
                                        <div key={index} className="bg-white p-6 rounded-2xl border-2 border-emerald-100 hover:border-emerald-300 transition-all">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xl font-black text-slate-800 uppercase mb-3">{med.name}</p>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dosage</p>
                                                            <p className="font-black text-emerald-700">{med.dosage || 'Not specified'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                                                            <p className="font-black text-emerald-700">{med.duration || 'Not specified'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white p-8 rounded-2xl text-center border-2 border-emerald-100">
                                    <Pill className="mx-auto text-slate-300 mb-3" size={48} />
                                    <p className="text-slate-400 font-bold uppercase">No medicines prescribed</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex justify-center">
                            <div className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-100 text-emerald-700 rounded-full">
                                <CheckCircle size={20} />
                                <span className="font-black uppercase text-sm">Consultation Completed</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoctorConsultations;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/admin/Dashboard';
import AdminFinance from './pages/admin/Finance';
import AdminReports from './pages/admin/Reports';
import CashierDashboard from './pages/cashier/Dashboard';
import PatientRegistration from './pages/cashier/PatientRegistration';
import PharmacySales from './pages/cashier/POS';
import MedicineRegistration from './pages/cashier/Medicines';
import SupplierManagement from './pages/cashier/Suppliers';
import DebtManagement from './pages/cashier/Debts';
import CashierReports from './pages/cashier/Reports';
import CashierFinance from './pages/cashier/Finance';
import CustomerManagement from './pages/cashier/Customers';
import LabPayments from './pages/cashier/LabPayments';
import DoctorConsultations from './pages/cashier/DoctorConsultations';

import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorConsultation from './pages/doctor/Consultation';
import LabDashboard from './pages/lab/Dashboard';
import LabTests from './pages/lab/Tests';
import LabPatientRegistration from './pages/lab/PatientRegistration';
import Profile from './pages/Profile';

// Placeholder components for other roles
const DashboardPlaceholder = ({ title }) => (
  <div className="card text-center py-20">
    <h1 className="text-3xl font-bold text-slate-800 mb-4">{title}</h1>
    <p className="text-medical-muted">Qaybtan wali waa la horumarinayaa.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/login" />} />

            {/* Admin Routes */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/finance" element={<AdminFinance />} />
            <Route path="admin/reports" element={<AdminReports />} />

            {/* Cashier Routes */}
            <Route path="cashier" element={<CashierDashboard />} />
            <Route path="cashier/register" element={<PatientRegistration />} />
            <Route path="cashier/queue" element={<DashboardPlaceholder title="Maamulka Safka" />} />
            <Route path="cashier/sales" element={<PharmacySales />} />
            <Route path="cashier/customers" element={<CustomerManagement />} />
            <Route path="cashier/medicines" element={<MedicineRegistration />} />
            <Route path="cashier/suppliers" element={<SupplierManagement />} />
            <Route path="cashier/debts" element={<DebtManagement />} />
            <Route path="cashier/finance" element={<CashierFinance />} />
            <Route path="cashier/reports" element={<CashierReports />} />
            <Route path="cashier/lab-payments" element={<LabPayments />} />
            <Route path="cashier/lab" element={<LabTests />} />
            <Route path="cashier/consultations" element={<DoctorConsultations />} />


            {/* Doctor Routes */}
            <Route path="doctor" element={<DoctorDashboard />} />
            <Route path="doctor/consult" element={<DoctorConsultation />} />

            {/* Lab Technician Routes */}
            <Route path="lab" element={<LabDashboard />} />
            <Route path="lab/patients" element={<LabPatientRegistration />} />
            <Route path="lab/tests" element={<LabTests />} />

            <Route path="lab/tests/:id" element={<LabTests />} />
            <Route path="lab/results" element={<DashboardPlaceholder title="Natiijooyinka Shaybaarka" />} />
            <Route path="lab/settings" element={<DashboardPlaceholder title="Dejimaha Shaybaarka" />} />

            {/* Profile Route (All Users) */}
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

import FinanceView from '../cashier/Finance';

function AdminFinance() {
  return (
    <FinanceView
      endpoint="/api/admin/finance"
      title="Maaliyadda Nidaamka"
      subtitle="Warbixin maaliyadeed oo cad oo ku salaysan dhammaan iibka, kharashka, faa'iidada, daymaha, iyo kaydka nidaamka oo dhan."
      showCashierColumn
    />
  );
}

export default AdminFinance;

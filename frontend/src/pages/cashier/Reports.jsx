import ReportsView from '../../components/ReportsView';

function CashierReports() {
  return (
    <ReportsView
      endpoint="/api/cashier/reports"
      title="Cashier Reports"
      subtitle="Track your real sales, debt collections, and customer payments using the selected filter."
    />
  );
}

export default CashierReports;

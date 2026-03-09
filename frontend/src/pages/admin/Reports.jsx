import ReportsView from '../../components/ReportsView';

function AdminReports() {
  return (
    <ReportsView
      endpoint="/api/admin/reports"
      title="System Reports"
      subtitle="Track real sales, money collected, and customer payments across the whole clinic."
    />
  );
}

export default AdminReports;

import ReportsView from '../../components/ReportsView';

function AdminReports() {
  return (
    <ReportsView
      endpoint="/api/admin/reports"
      title="Warbixinnada Nidaamka"
      subtitle="La soco iibka dhabta ah, lacagta la ururiyey, iyo lacag-bixinnada macaamiisha ee rugta oo dhan."
    />
  );
}

export default AdminReports;

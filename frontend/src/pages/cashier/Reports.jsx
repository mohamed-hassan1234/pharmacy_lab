import ReportsView from '../../components/ReportsView';

function CashierReports() {
  return (
    <ReportsView
      endpoint="/api/cashier/reports"
      title="Warbixinnada Qasnajiga"
      subtitle="La soco iibkaaga dhabta ah, ururinta daymaha, iyo lacag-bixinta macaamiisha adigoo adeegsanaya shaandhada la doortay."
    />
  );
}

export default CashierReports;

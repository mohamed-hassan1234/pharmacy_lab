import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart3,
  CreditCard,
  FileBarChart,
  Package,
  Printer,
  RefreshCcw,
  TrendingUp,
  Wallet
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { convertSosToUsd } from '../../utils/currency';

const API_BASE_URL = '';
const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Maalinle' },
  { value: 'weekly', label: 'Usbuucle' },
  { value: 'monthly', label: 'Bille' },
  { value: 'yearly', label: 'Sanadle' }
];

const formatMoney = (value) => `${Number(value || 0).toLocaleString()} SOS`;
const formatUsd = (value) => `$${convertSosToUsd(Number(value || 0))} USD`;
const formatDualMoney = (value) => `${formatMoney(value)} / ${formatUsd(value)}`;
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
const formatDateValue = (value, includeTime = false) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
};

const getComparisonLabel = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);

  if (previousValue === 0 && currentValue === 0) {
    return 'Isbeddel ma jiro';
  }

  if (previousValue === 0) {
    return 'Xog hore ma jirto';
  }

  const percent = ((currentValue - previousValue) / previousValue) * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
};

const FinanceCard = ({ icon: Icon, title, value, secondary, hint, comparison }) => (
  <div className="metric-card border-l-4 border-primary">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="metric-label">{title}</p>
        <h3 className="metric-value">{value}</h3>
        {secondary ? <p className="metric-hint">{secondary}</p> : null}
        {hint ? <p className="mt-1 text-xs font-bold text-slate-500">{hint}</p> : null}
        {comparison ? <p className="mt-2 text-xs font-black text-emerald-600">{comparison}</p> : null}
      </div>
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
        <Icon size={20} />
      </div>
    </div>
  </div>
);

const DualMoneyCell = ({ value, emphasize = false, tone = '' }) => (
  <div>
    <p className={`font-semibold ${emphasize ? tone || 'text-slate-800' : 'text-slate-800'}`}>{formatMoney(value)}</p>
    <p className="text-xs text-slate-500">{formatUsd(value)}</p>
  </div>
);

function CashierFinance({
  endpoint = '/api/cashier/finance',
  title = 'Maaliyadda Xisaabaadka',
  subtitle = "Warbixin maaliyadeed oo cad oo ku salaysan iibka, kharashka, faa'iidada, daynta, iyo qiimaha kaydka ee xogtaada kaydsan.",
  showCashierColumn = false
}) {
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const authConfig = () => {
    const user = JSON.parse(localStorage.getItem('clinic_user') || '{}');
    return {
      headers: {
        Authorization: `Bearer ${user?.token}`
      }
    };
  };

  const loadFinance = async (selectedPeriod = period, silent = false, overrideDates = null) => {
    try {
      setError('');
      if (!silent) {
        setLoading(true);
      }
      setRefreshing(true);

      const selectedStartDate = overrideDates ? overrideDates.startDate : startDate;
      const selectedEndDate = overrideDates ? overrideDates.endDate : endDate;
      const params = {
        period: selectedPeriod,
        _ts: Date.now()
      };

      if (selectedStartDate && selectedEndDate) {
        params.startDate = selectedStartDate;
        params.endDate = selectedEndDate;
      }

      const { data } = await axios.get(`${API_BASE_URL}${endpoint}`, {
        ...authConfig(),
        params
      });

      setReport(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Soo dejinta warbixinta maaliyadda way fashilantay.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinance(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const summary = report?.summary || {};
  const previous = report?.previous || {};
  const timeline = report?.timeline || [];
  const salesLedger = report?.salesLedger || [];
  const inventoryLedger = report?.inventoryLedger || [];
  const inventoryValueChart = report?.inventoryValueChart || [];
  const inventoryQuantityChart = report?.inventoryQuantityChart || [];
  const inventoryMoneyChart = report?.inventoryMoneyChart || [];
  const medicineSummaries = report?.medicineSummaries || [];
  const medicineProfitChart = report?.medicineProfitChart || [];
  const periodRange = report?.periodRange || {};
  const accountingNotes = report?.accountingNotes || {};
  const hasDateRange = Boolean(startDate && endDate);

  const buildPrintTable = (columns, rows, emptyMessage) => {
    if (!rows.length) {
      return `<div class="empty-row">${escapeHtml(emptyMessage)}</div>`;
    }

    return `
      <table>
        <thead>
          <tr>
            ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${column.render ? column.render(row) : escapeHtml(row?.[column.key] ?? '')}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const printFinanceReport = () => {
    if (!report) return;

    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) {
      alert('Fadlan u oggolow browser-ka inuu furo daaqadda daabacaadda.');
      return;
    }

    const summaryCards = [
      { label: 'Wadarta Iibka', value: formatMoney(summary.totalRevenue), secondary: formatUsd(summary.totalRevenue), comparison: getComparisonLabel(summary.totalRevenue, previous.totalRevenue) },
      { label: 'Kharashka Alaabta La Iibiyey', value: formatMoney(summary.totalCost), secondary: formatUsd(summary.totalCost), comparison: getComparisonLabel(summary.totalCost, previous.totalCost) },
      { label: 'Dakhliga Saafiga ah', value: formatMoney(summary.netIncome), secondary: formatUsd(summary.netIncome), comparison: getComparisonLabel(summary.netIncome, previous.netIncome) },
      { label: 'Biilasha', value: String(summary.invoiceCount || 0), secondary: 'Tirada biilasha muddadan', comparison: getComparisonLabel(summary.invoiceCount, previous.invoiceCount) },
      { label: 'Iibka Kaashka', value: formatMoney(summary.cashRevenue), secondary: formatUsd(summary.cashRevenue) },
      { label: 'Iibka Daynta', value: formatMoney(summary.creditRevenue), secondary: formatUsd(summary.creditRevenue) },
      { label: 'Qiimaha Wax Iibsiga ee Kaydka', value: formatMoney(summary.stockPurchaseValue), secondary: formatUsd(summary.stockPurchaseValue), comparison: `${Number(summary.totalBoxesInStock || 0).toLocaleString()} kartoon / ${Number(summary.totalUnitsInStock || 0).toLocaleString()} xabbo` },
      { label: 'Qiimaha La Filayo ee Iibka Kaydka', value: formatMoney(summary.stockExpectedSalesValue), secondary: formatUsd(summary.stockExpectedSalesValue), comparison: `Dayn harsan: ${formatDualMoney(summary.outstandingDebt)}` }
    ];

    const timelineTable = buildPrintTable(
      [
        { label: 'Muddada', render: (row) => escapeHtml(row.label || 'N/A') },
        { label: 'Iib', render: (row) => escapeHtml(formatDualMoney(row.revenue)) },
        { label: 'Kharash', render: (row) => escapeHtml(formatDualMoney(row.cost)) },
        { label: 'Dakhli Saafi ah', render: (row) => escapeHtml(formatDualMoney(row.profit)) }
      ],
      timeline,
      'Wax xog socod maaliyadeed ah lama helin muddadan.'
    );

    const salesLedgerTable = buildPrintTable(
      [
        { label: 'Biil', render: (row) => escapeHtml(row.invoiceNumber || 'N/A') },
        { label: 'Macmiil', render: (row) => escapeHtml(row.customerName || 'Ma jiro') },
        ...(showCashierColumn ? [{ label: 'Qasnaji', render: (row) => escapeHtml(row.cashierName || 'Ma jiro') }] : []),
        { label: 'Nooca Lacag-bixinta', render: (row) => escapeHtml(row.paymentType || 'N/A') },
        { label: 'Iib', render: (row) => escapeHtml(formatDualMoney(row.totalAmount)) },
        { label: 'Kharash', render: (row) => escapeHtml(formatDualMoney(row.totalCost)) },
        { label: 'Dakhli Saafi ah', render: (row) => escapeHtml(formatDualMoney(row.profit)) },
        { label: 'Taariikh', render: (row) => escapeHtml(formatDateValue(row.createdAt, true)) }
      ],
      salesLedger,
      'Iib la diiwaangeliyey muddadan ma jiro.'
    );

    const medicineSummaryTable = buildPrintTable(
      [
        { label: 'Daawo', render: (row) => `<strong>${escapeHtml(row.name || 'N/A')}</strong><div class="subcell">${escapeHtml(row.category || 'Guud')}</div>` },
        { label: 'Biilal', render: (row) => escapeHtml(Number(row.invoiceCount || 0).toLocaleString()) },
        { label: 'Kartoon La Iibiyey', render: (row) => escapeHtml(Number(row.boxesSold || 0).toLocaleString()) },
        { label: 'Xabbo La Iibiyey', render: (row) => escapeHtml(Number(row.looseUnitsSold || 0).toLocaleString()) },
        { label: 'Wadarta Xabbo', render: (row) => escapeHtml(Number(row.totalUnitsSold || 0).toLocaleString()) },
        { label: 'Kartoon Harsan', render: (row) => escapeHtml(Number(row.currentBoxesInStock || 0).toLocaleString()) },
        { label: 'Xabbo Harsan', render: (row) => escapeHtml(Number(row.currentUnitsInStock || 0).toLocaleString()) },
        { label: 'Iib', render: (row) => escapeHtml(formatDualMoney(row.totalRevenue)) },
        { label: 'Kharash', render: (row) => escapeHtml(formatDualMoney(row.totalCost)) },
        { label: "Faa'iido/Khasaare", render: (row) => escapeHtml(formatDualMoney(row.netIncome)) },
        { label: 'Celcelis Iib/Xabbo', render: (row) => escapeHtml(formatDualMoney(row.averageSellingPricePerUnit)) },
        { label: 'Celcelis Kharash/Xabbo', render: (row) => escapeHtml(formatDualMoney(row.averageCostPerUnit)) }
      ],
      medicineSummaries,
      'Daawooyin la iibiyey muddadan ma jiraan.'
    );

    const inventoryLedgerTable = buildPrintTable(
      [
        { label: 'Daawo', render: (row) => `<strong>${escapeHtml(row.name || 'N/A')}</strong><div class="subcell">${escapeHtml(row.category || 'Guud')}</div>` },
        { label: 'Alaab-qeybiye', render: (row) => escapeHtml(row.supplierName || 'Ma jiro') },
        { label: 'Qiimaha Iibsi/Kartoon', render: (row) => escapeHtml(formatDualMoney(row.purchasePricePerBox)) },
        { label: 'Xabbo/Kartoon', render: (row) => escapeHtml(Number(row.unitsPerBox || 0).toLocaleString()) },
        { label: 'Wadarta La Iibsaday', render: (row) => `${escapeHtml(Number(row.estimatedPurchasedBoxes || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }))} kartoon<div class="subcell">${escapeHtml(Number(row.estimatedPurchasedUnits || 0).toLocaleString())} xabbo</div>` },
        { label: 'Lacagta Wax Iibsiga', render: (row) => escapeHtml(formatDualMoney(row.estimatedPurchasedValue)) },
        { label: 'Kaydka Hadda Jira', render: (row) => `${escapeHtml(Number(row.boxesInStock || 0).toLocaleString())} kartoon<div class="subcell">${escapeHtml(Number(row.unitsInStock || 0).toLocaleString())} xabbo</div>` },
        { label: 'Qiimaha Kaydka', render: (row) => escapeHtml(formatDualMoney(row.stockCostValue)) },
        { label: 'Qiimaha Iibka ee La Filayo', render: (row) => escapeHtml(formatDualMoney(row.stockSaleValue)) },
        { label: "Faa'iidada La Filayo", render: (row) => escapeHtml(formatDualMoney(row.stockProfitValue)) }
      ],
      inventoryLedger,
      'Kayd daawo ma jiro.'
    );

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)} - Finance Report</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; background: #e2e8f0; }
            .sheet { width: 100%; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; background: #ffffff; }
            .header { border-bottom: 3px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
            .title { margin: 0; font-size: 26px; font-weight: 800; }
            .subtitle { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: #475569; }
            .meta { margin-top: 8px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; font-size: 11px; }
            .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
            .summary-card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; background: #f8fafc; }
            .summary-card h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #475569; }
            .summary-value { font-size: 16px; font-weight: 700; margin: 0; }
            .summary-secondary, .summary-comparison, .subcell { font-size: 10px; color: #64748b; margin-top: 4px; }
            .section { margin-top: 18px; }
            .page-break { page-break-before: always; }
            .section h2 { margin: 0 0 8px; font-size: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; }
            .section p { margin: 5px 0; font-size: 11px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 7px; vertical-align: top; word-break: break-word; font-size: 10px; text-align: left; }
            th { background: #e2e8f0; font-size: 10px; text-transform: uppercase; }
            .empty-row { border: 1px dashed #cbd5e1; border-radius: 10px; padding: 12px; font-size: 11px; color: #64748b; background: #f8fafc; }
            @media print { body { background: #ffffff; } .sheet { max-width: none; margin: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <h1 class="title">${escapeHtml(title)}</h1>
              <p class="subtitle">${escapeHtml(subtitle)}</p>
              <div class="meta">
                <div><strong>Muddada:</strong> ${escapeHtml(hasDateRange ? 'Xulashada taariikhda' : (periodRange.currentLabel || 'N/A'))}</div>
                <div><strong>La sameeyey:</strong> ${escapeHtml(formatDateValue(new Date(), true))}</div>
                <div><strong>Laga bilaabo:</strong> ${escapeHtml(formatDateValue(periodRange.currentStart))}</div>
                <div><strong>Ilaa:</strong> ${escapeHtml(formatDateValue(periodRange.currentEnd))}</div>
              </div>
            </div>

            <div class="summary-grid">
              ${summaryCards.map((card) => `
                <div class="summary-card">
                  <h3>${escapeHtml(card.label)}</h3>
                  <p class="summary-value">${escapeHtml(card.value)}</p>
                  ${card.secondary ? `<div class="summary-secondary">${escapeHtml(card.secondary)}</div>` : ''}
                  ${card.comparison ? `<div class="summary-comparison">${escapeHtml(card.comparison)}</div>` : ''}
                </div>
              `).join('')}
            </div>

            <div class="section">
              <h2>Habka Xisaabta</h2>
              <p>${escapeHtml(accountingNotes.medicineCostBasis || 'Xog hab xisaabeed lama helin.')}</p>
              ${accountingNotes.inventoryPurchaseBasis ? `<p>${escapeHtml(accountingNotes.inventoryPurchaseBasis)}</p>` : ''}
              <p>Dhammaan xogtaada waxa ay ku kaydsan tahay SOS, halka USD lagu muujinayo si akhrisku u sahlanaado.</p>
            </div>

            <div class="section">
              <h2>Socodka Maaliyadda</h2>
              ${timelineTable}
            </div>

            <div class="section page-break">
              <h2>Diiwaanka Iibka</h2>
              ${salesLedgerTable}
            </div>

            <div class="section page-break">
              <h2>Warbixinta Daawooyinka</h2>
              ${medicineSummaryTable}
            </div>

            <div class="section page-break">
              <h2>Xisaabta Kaydka iyo Qiimaha Wax Iibsiga</h2>
              ${inventoryLedgerTable}
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };

  return (
    <section className="page-section">
      <div className="section-header">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="section-title">{title}</h1>
            <p className="section-subtitle">{subtitle}</p>
            {report ? (
              <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-500">
                {(hasDateRange ? 'Xulashada taariikhda' : periodRange.currentLabel)} • {new Date(periodRange.currentStart).toLocaleDateString()} ilaa {new Date(new Date(periodRange.currentEnd).getTime() - 86400000).toLocaleDateString()}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="cashier-finance-period">Muddada</label>
              <select
                id="cashier-finance-period"
                className="input-field"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cashier-finance-start-date">Laga bilaabo</label>
              <input
                id="cashier-finance-start-date"
                type="date"
                className="input-field"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cashier-finance-end-date">Ilaa</label>
              <input
                id="cashier-finance-end-date"
                type="date"
                className="input-field"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <button type="button" className="btn-primary" onClick={() => loadFinance(period, true)} disabled={refreshing}>
              <RefreshCcw size={16} />
              {refreshing ? 'Waa la cusboonaysiinayaa...' : 'Cusboonaysii'}
            </button>
            <button type="button" className="btn-secondary" onClick={printFinanceReport} disabled={loading || !report}>
              <Printer size={16} />
              Daabac A4
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                loadFinance(period, true, { startDate: '', endDate: '' });
              }}
              disabled={refreshing || (!startDate && !endDate)}
            >
              Nadiifi Taariikhaha
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && report ? (
          <div className="card border border-amber-200 bg-amber-50 text-sm text-amber-900">
          <p className="font-semibold">Habka xisaabta:</p>
          <p className="mt-1">{accountingNotes.medicineCostBasis}</p>
          {accountingNotes.inventoryPurchaseBasis ? <p className="mt-1">{accountingNotes.inventoryPurchaseBasis}</p> : null}
          <p className="mt-2 text-xs font-bold">
            Dhammaan xogtaadu waxa ay ku kaydsan tahay `SOS`, halka `USD` halkan lagu muujinayo oo keliya si akhrisku u fududaado.
          </p>
        </div>
      ) : null}

      {loading ? (
        <div className="card">
          <p className="text-sm text-slate-500">Warbixinta maaliyadda waa la soo dejinayaa...</p>
        </div>
      ) : null}

      {!loading && report ? (
        <>
          <div className="metrics-grid">
            <FinanceCard
              icon={Wallet}
              title="Wadarta Iibka"
              value={formatMoney(summary.totalRevenue)}
              secondary={formatUsd(summary.totalRevenue)}
              hint="Lacagta guud ee iibka muddadan."
              comparison={getComparisonLabel(summary.totalRevenue, previous.totalRevenue)}
            />
            <FinanceCard
              icon={CreditCard}
              title="Kharashka Alaabta La Iibiyey"
              value={formatMoney(summary.totalCost)}
              secondary={formatUsd(summary.totalCost)}
              hint="Qiimaha wax iibsiga ee alaabta la iibiyey muddadan."
              comparison={getComparisonLabel(summary.totalCost, previous.totalCost)}
            />
            <FinanceCard
              icon={TrendingUp}
              title="Dakhliga Saafiga ah"
              value={formatMoney(summary.netIncome)}
              secondary={formatUsd(summary.netIncome)}
              hint="Faa'iidada nadiifka ah ee iibka la xaqiijiyey."
              comparison={getComparisonLabel(summary.netIncome, previous.netIncome)}
            />
            <FinanceCard
              icon={FileBarChart}
              title="Biilasha"
              value={String(summary.invoiceCount || 0)}
              hint="Tirada biilasha la sameeyey muddadan."
              comparison={getComparisonLabel(summary.invoiceCount, previous.invoiceCount)}
            />
          </div>

          <div className="metrics-grid">
            <FinanceCard
              icon={Wallet}
              title="Iibka Kaashka"
              value={formatMoney(summary.cashRevenue)}
              secondary={formatUsd(summary.cashRevenue)}
              hint="Iibka si toos ah lacagta loogu bixiyey."
            />
            <FinanceCard
              icon={CreditCard}
              title="Iibka Daynta"
              value={formatMoney(summary.creditRevenue)}
              secondary={formatUsd(summary.creditRevenue)}
              hint="Iibka lagu qaaday dayn."
            />
            <FinanceCard
              icon={Package}
              title="Qiimaha Wax Iibsiga ee Kaydka"
              value={formatMoney(summary.stockPurchaseValue)}
              secondary={formatUsd(summary.stockPurchaseValue)}
              hint={`${Number(summary.totalBoxesInStock || 0).toLocaleString()} kartoon • ${Number(summary.totalUnitsInStock || 0).toLocaleString()} xabbo`}
            />
            <FinanceCard
              icon={Package}
              title="Qiimaha La Filayo ee Iibka Kaydka"
              value={formatMoney(summary.stockExpectedSalesValue)}
              secondary={formatUsd(summary.stockExpectedSalesValue)}
              hint={`Dayn harsan: ${formatDualMoney(summary.outstandingDebt)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Socodka Maaliyadda ee Muddadan</h2>
                <p className="text-sm text-slate-500">
                  Dakhliga, kharashka, iyo dakhliga saafiga ah ee ku jira muddada aad dooratay.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [formatDualMoney(value)]} />
                  <Legend />
                  <Bar dataKey="revenue" name="Iib" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" name="Kharash" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Dakhli Saafi ah" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Qiimaha Kaydka ee Ugu Sarreeya</h2>
                <p className="text-sm text-slate-500">
                  Daawooyinka leh qiimaha wax iibsiga iyo qiimaha iibka ee kaydka ugu badan.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={inventoryValueChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#94a3b8" hide={inventoryValueChart.length > 5} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [formatDualMoney(value)]} />
                  <Legend />
                  <Area type="monotone" dataKey="purchaseValue" name="Qiimaha Wax Iibsiga" stroke="#0f766e" fill="#ccfbf1" strokeWidth={2} />
                  <Area type="monotone" dataKey="salesValue" name="Qiimaha Iibka" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Tirada La Iibsaday iyo Kaydka Hadda Jira</h2>
                <p className="text-sm text-slate-500">
                  Daawo kasta waxa uu chart-kan ku tusayaa wadarta xabbaha la iibsaday iyo inta weli bakhaarka ku jirta.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={inventoryQuantityChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#94a3b8" hide={inventoryQuantityChart.length > 6} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [Number(value || 0).toLocaleString(), 'Xabbo']} />
                  <Legend />
                  <Bar dataKey="purchasedUnits" name="Wadarta La Iibsaday" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inStockUnits" name="Kaydka Hadda Jira" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Lacagta Wax Iibsiga iyo Qiimaha Kaydka</h2>
                <p className="text-sm text-slate-500">
                  Halkan waxaad ku aragtaa lacagta lagu qiyaasay in lagu soo iibshay daawo kasta iyo qiimaha kaydka hadda yaal.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={inventoryMoneyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#94a3b8" hide={inventoryMoneyChart.length > 6} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [formatDualMoney(value)]} />
                  <Legend />
                  <Bar dataKey="purchasedValue" name="Lacagta Wax Iibsiga" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stockValue" name="Qiimaha Kaydka" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Faa'iidada Daawooyinka</h2>
              <p className="text-sm text-slate-500">
                Jaantuskani waxa uu tusayaa daawo kasta inta laga iibiyey, kharashkeeda, iyo faa'iidada ama khasaaraha ka soo baxay.
              </p>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={medicineProfitChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#94a3b8" hide={medicineProfitChart.length > 6} />
                <YAxis stroke="#94a3b8" />
                <Tooltip formatter={(value) => [formatDualMoney(value)]} />
                <Legend />
                <Bar dataKey="revenue" name="Iib" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Kharash" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Faa'iido/Khasaare" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Diiwaanka Iibka</h2>
              <p className="text-sm text-slate-500">
                Biil kasta waxa uu muujinayaa lacagta la iibiyey, kharashkii alaabta, iyo dakhliga saafiga ah.
              </p>
            </div>
            <div className="table-shell">
              <table className="data-table striped-table">
                <thead>
                  <tr>
                    <th>Biil</th>
                    <th>Macmiil</th>
                    {showCashierColumn ? <th>Qasnaji</th> : null}
                    <th>Nooca Lacag-bixinta</th>
                    <th>Iib</th>
                    <th>Kharash</th>
                    <th>Dakhli Saafi ah</th>
                    <th>Taariikh</th>
                  </tr>
                </thead>
                <tbody>
                  {salesLedger.map((sale) => (
                    <tr key={sale._id}>
                      <td>{sale.invoiceNumber}</td>
                      <td>{sale.customerName}</td>
                      {showCashierColumn ? <td>{sale.cashierName || 'Ma jiro'}</td> : null}
                      <td>{sale.paymentType}</td>
                      <td><DualMoneyCell value={sale.totalAmount} emphasize /></td>
                      <td><DualMoneyCell value={sale.totalCost} /></td>
                      <td><DualMoneyCell value={sale.profit} emphasize tone={Number(sale.profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} /></td>
                      <td>{new Date(sale.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {salesLedger.length === 0 ? (
                    <tr>
                      <td colSpan={showCashierColumn ? 8 : 7} className="py-10 text-center text-slate-500">Iib la diiwaangeliyey muddadan ma jiro.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Warbixinta Daawooyinka</h2>
              <p className="text-sm text-slate-500">
                Waxaad halkan ku arki kartaa daawo kasta inta laga iibiyey, qiimaha iibka, kharashka, iyo faa'iidada ama khasaaraha si qof walba u fahmi karo.
              </p>
            </div>
            <div className="table-shell">
              <table className="data-table striped-table">
                <thead>
                  <tr>
                    <th>Daawo</th>
                    <th>Biilal</th>
                    <th>Kartoon La Iibiyey</th>
                    <th>Xabbo La Iibiyey</th>
                    <th>Wadarta Xabbo</th>
                    <th>Kartoon Harsan</th>
                    <th>Xabbo Harsan</th>
                    <th>Iib</th>
                    <th>Kharash</th>
                    <th>Faa'iido/Khasaare</th>
                    <th>Celcelis Iib/Xabbo</th>
                    <th>Celcelis Kharash/Xabbo</th>
                  </tr>
                </thead>
                <tbody>
                  {medicineSummaries.map((item) => (
                    <tr key={item.medicineId || item.name}>
                      <td>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category || 'Guud'}</p>
                      </td>
                      <td>{Number(item.invoiceCount || 0).toLocaleString()}</td>
                      <td>{Number(item.boxesSold || 0).toLocaleString()}</td>
                      <td>{Number(item.looseUnitsSold || 0).toLocaleString()}</td>
                      <td>{Number(item.totalUnitsSold || 0).toLocaleString()}</td>
                      <td>{Number(item.currentBoxesInStock || 0).toLocaleString()}</td>
                      <td>{Number(item.currentUnitsInStock || 0).toLocaleString()}</td>
                      <td><DualMoneyCell value={item.totalRevenue} emphasize /></td>
                      <td><DualMoneyCell value={item.totalCost} /></td>
                      <td><DualMoneyCell value={item.netIncome} emphasize tone={Number(item.netIncome || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} /></td>
                      <td><DualMoneyCell value={item.averageSellingPricePerUnit} /></td>
                      <td><DualMoneyCell value={item.averageCostPerUnit} /></td>
                    </tr>
                  ))}
                  {medicineSummaries.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="py-10 text-center text-slate-500">Daawooyin la iibiyey muddadan ma jiraan.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Xisaabta Kaydka iyo Qiimaha Wax Iibsiga</h2>
              <p className="text-sm text-slate-500">
                Jadwalkani waxa uu si cad kuu tusayaa qiimaha aad wax ku iibsatay, tirada kaydka, iyo faa'iidada la filayo daawo kasta.
              </p>
            </div>
            <div className="table-shell">
              <table className="data-table striped-table">
                <thead>
                  <tr>
                    <th>Daawo</th>
                    <th>Alaab-qeybiye</th>
                    <th>Qiimaha Iibsi/Kartoon</th>
                    <th>Xabbo/Kartoon</th>
                    <th>Wadarta La Iibsaday</th>
                    <th>Lacagta Wax Iibsiga</th>
                    <th>Kaydka Hadda Jira</th>
                    <th>Qiimaha Kaydka</th>
                    <th>Qiimaha Iibka ee La Filayo</th>
                    <th>Faa'iidada La Filayo</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryLedger.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.category || 'Guud'}</p>
                      </td>
                      <td>{item.supplierName || 'Ma jiro'}</td>
                      <td>
                        <DualMoneyCell value={item.purchasePricePerBox} emphasize />
                      </td>
                      <td>{Number(item.unitsPerBox || 0).toLocaleString()}</td>
                      <td>
                        <p>{Number(item.estimatedPurchasedBoxes || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} kartoon</p>
                        <p className="text-xs text-slate-500">{Number(item.estimatedPurchasedUnits || 0).toLocaleString()} xabbo</p>
                      </td>
                      <td><DualMoneyCell value={item.estimatedPurchasedValue} emphasize /></td>
                      <td>
                        <p>{Number(item.boxesInStock || 0).toLocaleString()} kartoon</p>
                        <p className="text-xs text-slate-500">{Number(item.unitsInStock || 0).toLocaleString()} xabbo</p>
                      </td>
                      <td><DualMoneyCell value={item.stockCostValue} emphasize /></td>
                      <td><DualMoneyCell value={item.stockSaleValue} /></td>
                      <td><DualMoneyCell value={item.stockProfitValue} emphasize tone={Number(item.stockProfitValue || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'} /></td>
                    </tr>
                  ))}
                  {inventoryLedger.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-10 text-center text-slate-500">Kayd daawo ma jiro.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

export default CashierFinance;

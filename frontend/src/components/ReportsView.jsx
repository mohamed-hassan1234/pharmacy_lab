import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CreditCard, RefreshCcw, TrendingUp, Users, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { convertSosToUsd, convertUsdToSos } from '../utils/currency';

const API_BASE_URL = '';
const DEFAULT_SOS_PER_USD = 28;

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Maalinle' },
  { value: 'weekly', label: 'Usbuucle' },
  { value: 'monthly', label: 'Bille' },
  { value: 'yearly', label: 'Sanadle' },
];

const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number(value || 0));

const formatMoney = (value, currencyCode = 'SOS') => `${currencyCode} ${formatNumber(value)}`;
const PERIOD_LABELS = {
  daily: 'Maalinle',
  weekly: 'Usbuucle',
  monthly: 'Bille',
  yearly: 'Sanadle',
  'previous period': 'muddadii hore',
};
const PAYMENT_TYPE_LABELS = {
  CASH: 'Kaash',
  CREDIT: 'Dayn',
};

const getUsdEquivalent = (value, currencyCode = 'SOS', exchangeRate = DEFAULT_SOS_PER_USD) => {
  const amount = Number(value || 0);
  const normalizedCurrency = String(currencyCode || 'SOS').toUpperCase();

  if (normalizedCurrency === 'USD') {
    return formatMoney(amount, 'USD');
  }

  return formatMoney(Number(convertSosToUsd(amount)), 'USD');
};

const getPurchaseUsdDisplay = (
  purchase = {},
  exchangeRate = DEFAULT_SOS_PER_USD,
  fallbackCurrency = 'SOS',
  medicineLookup = new Map(),
) => {
  const explicitUsdAmount = Number(purchase.usdTotalAmount || 0);

  if (explicitUsdAmount > 0) {
    return formatMoney(explicitUsdAmount, 'USD');
  }

  const snapshotUsdAmount = getUsdFromPricingSnapshot(purchase);
  if (snapshotUsdAmount > 0) {
    return formatMoney(snapshotUsdAmount, 'USD');
  }

  const inventoryMatchedUsdAmount = getMedicineUsdFromInventory(purchase, medicineLookup);
  if (inventoryMatchedUsdAmount > 0) {
    return formatMoney(inventoryMatchedUsdAmount, 'USD');
  }

  return getUsdEquivalent(purchase.totalAmount, purchase.currency || fallbackCurrency, exchangeRate);
};

const getMetricDisplay = (currencyTotals, fallbackValue, fallbackCurrency = 'SOS') => {
  const sosValue = Number(currencyTotals?.SOS || 0);
  const usdValue = Number(currencyTotals?.USD || 0);

  if (sosValue > 0 && usdValue > 0) {
    return {
      primary: formatMoney(sosValue, 'SOS'),
      secondary: formatMoney(usdValue, 'USD'),
    };
  }

  if (usdValue > 0) {
    return {
      primary: formatMoney(usdValue, 'USD'),
      secondary: formatMoney(Number(convertUsdToSos(usdValue)), 'SOS'),
    };
  }

  if (sosValue > 0 || currencyTotals) {
    return {
      primary: formatMoney(sosValue, 'SOS'),
      secondary: formatMoney(Number(convertSosToUsd(sosValue)), 'USD'),
    };
  }

  if (fallbackCurrency === 'USD') {
    return {
      primary: formatMoney(fallbackValue, 'USD'),
      secondary: formatMoney(Number(convertUsdToSos(fallbackValue)), 'SOS'),
    };
  }

  return {
    primary: formatMoney(fallbackValue, fallbackCurrency),
    secondary: formatMoney(Number(convertSosToUsd(fallbackValue)), 'USD'),
  };
};

const formatDateTime = (value) => {
  if (!value) return 'Ma jiro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ma jiro';

  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return 'Ma jiro';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Ma jiro';

  return date.toLocaleDateString();
};

const formatItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return 'Wax alaab ah ma jiro';

  return items
    .map((item) => {
      const name = item.medicineName || item.name || item.medicine?.name || 'Daawo';
      const quantity = item.quantity ?? item.units ?? item.unitsSold ?? 0;
      return `${name} x${quantity}`;
    })
    .join(', ');
};

const getRawNumber = (...values) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return 0;
};

const getPurchaseItemQuantity = (item = {}) => {
  const quantity = getRawNumber(
    item.quantity,
    item.units,
    item.unitsSold,
    item.boxes,
    item.qty,
    1,
  );

  return quantity > 0 ? quantity : 1;
};

const getPurchaseItemName = (item = {}) =>
  String(
    item.medicineName ||
    item.name ||
    item.medicine?.name ||
    item.productName ||
    '',
  ).trim().toLowerCase();

const buildMedicineLookup = (medicines = []) => {
  const byName = new Map();

  medicines.forEach((medicine) => {
    const name = String(medicine?.name || '').trim().toLowerCase();
    if (name) {
      byName.set(name, medicine);
    }
  });

  return byName;
};

const flattenNumericEntries = (value, prefix = '', seen = new Set()) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  if (seen.has(value)) {
    return [];
  }

  seen.add(value);

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) {
      return [{ key: nextKey.toLowerCase(), value: nestedValue }];
    }

    if (typeof nestedValue === 'string') {
      const numeric = Number(nestedValue);
      if (Number.isFinite(numeric) && nestedValue.trim() !== '') {
        return [{ key: nextKey.toLowerCase(), value: numeric }];
      }
    }

    if (nestedValue && typeof nestedValue === 'object') {
      return flattenNumericEntries(nestedValue, nextKey, seen);
    }

    return [];
  });
};

const findMedicinePrice = (medicine, keywordGroups) => {
  const numericEntries = flattenNumericEntries(medicine);

  for (const keywords of keywordGroups) {
    const matchedEntry = numericEntries.find(({ key }) => keywords.every((keyword) => key.includes(keyword)));
    if (matchedEntry && matchedEntry.value > 0) {
      return matchedEntry.value;
    }
  }

  return 0;
};

const getMedicineUsdFromInventory = (purchase, medicineLookup) => {
  if (!purchase || !Array.isArray(purchase.items) || purchase.items.length !== 1) {
    return 0;
  }

  const item = purchase.items[0];
  const medicine = medicineLookup.get(getPurchaseItemName(item));

  if (!medicine) {
    return 0;
  }

  const quantity = getPurchaseItemQuantity(item);
  const totalSOS = getRawNumber(purchase.totalAmount);
  const boxSOS = getRawNumber(
    medicine.sellingPricePerBoxSOS,
    medicine.salePricePerBoxSOS,
    findMedicinePrice(medicine, [
      ['selling', 'box', 'sos'],
      ['sale', 'box', 'sos'],
      ['box', 'sos'],
    ]),
  );
  const unitSOS = getRawNumber(
    medicine.sellingPricePerUnitSOS,
    medicine.salePricePerUnitSOS,
    findMedicinePrice(medicine, [
      ['selling', 'unit', 'sos'],
      ['sale', 'unit', 'sos'],
      ['unit', 'sos'],
    ]),
  );
  const boxUSD = getRawNumber(
    medicine.sellingPricePerBoxUSD,
    medicine.salePricePerBoxUSD,
    findMedicinePrice(medicine, [
      ['selling', 'box', 'usd'],
      ['sale', 'box', 'usd'],
      ['box', 'usd'],
    ]),
  );
  const unitUSD = getRawNumber(
    medicine.sellingPricePerUnitUSD,
    medicine.salePricePerUnitUSD,
    findMedicinePrice(medicine, [
      ['selling', 'unit', 'usd'],
      ['sale', 'unit', 'usd'],
      ['unit', 'usd'],
    ]),
  );
  const epsilon = 0.01;

  if (boxSOS > 0 && boxUSD > 0 && Math.abs(totalSOS - (boxSOS * quantity)) <= epsilon) {
    return boxUSD * quantity;
  }

  if (unitSOS > 0 && unitUSD > 0 && Math.abs(totalSOS - (unitSOS * quantity)) <= epsilon) {
    return unitUSD * quantity;
  }

  return 0;
};

const getUsdFromPricingSnapshot = (purchase = {}) => {
  const snapshot = purchase.pricingSnapshot;

  if (!snapshot) {
    return 0;
  }

  const quantity = getRawNumber(snapshot.quantity, 1);
  const totalSOS = getRawNumber(purchase.totalAmount);
  const boxSOS = getRawNumber(snapshot.sellingPricePerBoxSOS);
  const unitSOS = getRawNumber(snapshot.sellingPricePerUnitSOS);
  const boxUSD = getRawNumber(snapshot.sellingPricePerBoxUSD);
  const unitUSD = getRawNumber(snapshot.sellingPricePerUnitUSD);
  const epsilon = 0.01;

  if (boxSOS > 0 && boxUSD > 0 && Math.abs(totalSOS - (boxSOS * quantity)) <= epsilon) {
    return boxUSD * quantity;
  }

  if (unitSOS > 0 && unitUSD > 0 && Math.abs(totalSOS - (unitSOS * quantity)) <= epsilon) {
    return unitUSD * quantity;
  }

  return 0;
};

const getComparison = (currentValue, previousValue, previousLabel) => {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous === 0 && current === 0) {
    return {
      tone: 'neutral',
      label: `${previousLabel.toLowerCase()} wax dhaqdhaqaaq ah kama jirin`,
    };
  }

  if (previous === 0) {
    return {
      tone: 'neutral',
      label: `${previousLabel.toLowerCase()} xog hore looma hayo`,
    };
  }

  const diff = current - previous;
  const percent = (diff / previous) * 100;

  return {
    tone: diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral',
    label: `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}% marka loo eego ${previousLabel.toLowerCase()}`,
  };
};

const MetricCard = ({ icon: Icon, label, value, secondaryValue, hint, comparison }) => {
  const comparisonClass =
    comparison?.tone === 'positive'
      ? 'text-emerald-600'
      : comparison?.tone === 'negative'
        ? 'text-red-600'
        : 'text-medical-muted';

  return (
    <div className="metric-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
          {secondaryValue ? <p className="mt-1 text-sm font-semibold text-secondary">{secondaryValue}</p> : null}
          {hint ? <p className="metric-hint">{hint}</p> : null}
          {comparison ? <p className={`mt-2 text-xs font-semibold ${comparisonClass}`}>{comparison.label}</p> : null}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ title, subtitle }) => (
  <div className="rounded-2xl border border-dashed border-primary/20 bg-medical-surface-muted px-4 py-8 text-center">
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    <p className="mt-1 text-sm text-medical-muted">{subtitle}</p>
  </div>
);

function ReportsView({ endpoint, title, subtitle }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasDateRange = Boolean(startDate && endDate);

  const loadReport = async ({ silent = false } = {}) => {
    const token = user?.token;
    if (!token) {
      setError('Token-ka gelitaanka waa maqan yahay.');
      setLoading(false);
      return;
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      setError('Dooro taariikhda bilowga iyo dhammaadka si warbixin gaar ah loo soo saaro.');
      setLoading(false);
      setSubmitting(false);
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    setSubmitting(true);
    setError('');

    try {
      const params = {};

      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else {
        params.period = period;
      }

      // Avoid stale 304/cached report payloads after backend report logic changes.
      params._ts = Date.now();

      const { data } = await axios.get(`${API_BASE_URL}${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setReport(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Soo dejinta xogta warbixinta way fashilantay.');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  const loadMedicines = async () => {
    const token = user?.token;
    if (!token) return;

    const candidateEndpoints = [
      '/api/inventory/medicines',
      '/api/cashier/inventory',
      '/api/inventory',
      '/api/cashier/medicines',
    ];

    for (const candidateEndpoint of candidateEndpoints) {
      try {
        const { data } = await axios.get(`${API_BASE_URL}${candidateEndpoint}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            _ts: Date.now(),
          },
        });

        if (Array.isArray(data) && data.length > 0) {
          setMedicines(data);
          return;
        }
      } catch {
        // Try the next inventory endpoint.
      }
    }
  };

  useEffect(() => {
    loadReport();
    loadMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const periodRange = report?.periodRange || {};
  const previous = report?.previous || {};
  const currencyCode = report?.displayCurrency || 'SOS';
  const exchangeRate = Number(report?.exchangeRate || convertUsdToSos(1) || DEFAULT_SOS_PER_USD);
  const medicineLookup = buildMedicineLookup(medicines);
  const currentPeriodLabel = PERIOD_LABELS[periodRange.currentLabel?.toLowerCase?.()] || periodRange.currentLabel || 'Ma jiro';
  const previousPeriodLabel = PERIOD_LABELS[periodRange.previousLabel?.toLowerCase?.()] || periodRange.previousLabel || 'muddadii hore';
  const moneyReceivedDisplay = getMetricDisplay(report?.currencyTotals?.actualMoneyReceived, report?.actualMoneyReceived, currencyCode);
  const debtCollectionsDisplay = getMetricDisplay(report?.currencyTotals?.debtCollectionsAmount, report?.debtCollectionsAmount, currencyCode);
  const totalRevenueDisplay = getMetricDisplay(report?.currencyTotals?.totalRevenue, report?.totalRevenue, currencyCode);
  const totalProfitDisplay = getMetricDisplay(report?.currencyTotals?.totalProfit, report?.totalProfit, currencyCode);
  const totalDebtDisplay = getMetricDisplay(report?.currencyTotals?.totalDebts, report?.totalDebts, currencyCode);
  const cashRevenueDisplay = getMetricDisplay(report?.currencyTotals?.cashRevenue, report?.cashRevenue, currencyCode);
  const creditRevenueDisplay = getMetricDisplay(report?.currencyTotals?.creditRevenue, report?.creditRevenue, currencyCode);
  const moneyComparison = getComparison(
    report?.actualMoneyReceived,
    previous.actualMoneyReceived,
    previousPeriodLabel,
  );
  const salesComparison = getComparison(
    report?.totalRevenue,
    previous.totalRevenue,
    previousPeriodLabel,
  );
  const profitComparison = getComparison(
    report?.totalProfit,
    previous.totalProfit,
    previousPeriodLabel,
  );
  const ordersComparison = getComparison(
    report?.orderCount,
    previous.orderCount,
    previousPeriodLabel,
  );

  const activeRangeLabel = hasDateRange
    ? `${startDate} ilaa ${endDate}`
    : report
      ? `${formatDateOnly(periodRange.currentStart)} ilaa ${formatDateOnly(
          new Date(new Date(periodRange.currentEnd).getTime() - 86400000),
        )}`
      : 'Ma jiro';

  return (
    <section className="page-section">
      <div className="section-header">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="section-title">{title}</h1>
            <p className="section-subtitle">{subtitle}</p>
            {report ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary-light px-3 py-1 text-xs font-semibold text-secondary">
                <CalendarDays size={14} />
                {hasDateRange ? 'Shaandhada Taariikhda' : currentPeriodLabel}: {activeRangeLabel}
              </p>
            ) : null}
          </div>

          <div className="grid w-full gap-3 md:grid-cols-4 lg:max-w-4xl">
            <div>
              <label htmlFor="report-period">Shaandhada Warbixinta</label>
              <select
                id="report-period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="input-field"
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-start-date">Laga bilaabo</label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="report-end-date">Ilaa</label>
              <input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="input-field"
              />
            </div>

            <div className="flex items-end gap-2">
              <button type="button" onClick={() => loadReport()} disabled={submitting} className="btn-primary flex-1">
                <RefreshCcw size={16} />
                {submitting ? 'Waa la soo dejinayaa...' : 'Codso'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                disabled={submitting || (!startDate && !endDate)}
                className="btn-secondary"
              >
                Nadiifi Taariikhaha
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="card border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card">
          <p className="text-sm text-medical-muted">Xogta warbixinta waa la soo dejinayaa...</p>
        </div>
      ) : null}

      {!loading && report ? (
        <>
          <div className="metrics-grid">
            <MetricCard
              icon={Wallet}
              label="Lacagta La Helay"
              value={moneyReceivedDisplay.primary}
              secondaryValue={moneyReceivedDisplay.secondary}
              hint="Iibka kaashka ah iyo lacagaha daymaha la ururiyey muddadan la doortay."
              comparison={moneyComparison}
            />
            <MetricCard
              icon={CreditCard}
              label="Ururinta Daymaha"
              value={debtCollectionsDisplay.primary}
              secondaryValue={debtCollectionsDisplay.secondary}
              hint="Lacagta ay dambe ku bixiyeen macaamiisha daynta leh."
              comparison={getComparison(
                report.debtCollectionsAmount,
                previous.debtCollectionsAmount,
                previousPeriodLabel,
              )}
            />
            <MetricCard
              icon={TrendingUp}
              label="Wadarta Qiimaha Iibka"
              value={totalRevenueDisplay.primary}
              secondaryValue={totalRevenueDisplay.secondary}
              hint="Dhammaan biilasha la sameeyey muddadan la doortay."
              comparison={salesComparison}
            />
            <MetricCard
              icon={Users}
              label="Faa'iidada Saafiga ah"
              value={totalProfitDisplay.primary}
              secondaryValue={totalProfitDisplay.secondary}
              hint="Faa'iidada laga helay iibka la diiwaangeliyey muddadan."
              comparison={profitComparison}
            />
          </div>

          <div className="metrics-grid">
            <MetricCard
              icon={CreditCard}
              label="Daynta Harsan"
              value={totalDebtDisplay.primary}
              secondaryValue={totalDebtDisplay.secondary}
              hint="Daynta aan weli la bixin ee nidaamka ku harsan."
            />
            <MetricCard
              icon={Wallet}
              label="Iibka Kaashka"
              value={cashRevenueDisplay.primary}
              secondaryValue={cashRevenueDisplay.secondary}
              hint="Biilasha kaashka ah ee la sameeyey muddadan."
              comparison={getComparison(
                report.cashRevenue,
                previous.cashRevenue,
                previousPeriodLabel,
              )}
            />
            <MetricCard
              icon={CreditCard}
              label="Iibka Daynta"
              value={creditRevenueDisplay.primary}
              secondaryValue={creditRevenueDisplay.secondary}
              hint="Biilasha daynta ah ee la sameeyey muddadan."
              comparison={getComparison(
                report.creditRevenue,
                previous.creditRevenue,
                previousPeriodLabel,
              )}
            />
            <MetricCard
              icon={Users}
              label="Biilal"
              value={String(report.orderCount || 0)}
              hint="Tirada iibka ee muddadan la doortay."
              comparison={ordersComparison}
            />
          </div>

          <div className="card">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Akhrinta Warbixinta</h2>
                <p className="text-sm text-medical-muted">
                  Qiimaha USD ee iibsiga daawada waxa uu adeegsanayaa qiimaha iibka daawada ee tirada la dalbaday marka xogtaas kaydsan ay jirto.
                </p>
              </div>
              <div className="rounded-2xl bg-primary-light px-4 py-3 text-sm text-primary-dark">
                <p className="font-semibold">{hasDateRange ? 'Shaandhada Taariikhda' : currentPeriodLabel}</p>
                <p>{activeRangeLabel}</p>
                <p className="mt-1 text-xs text-medical-muted">Sarrifka USD: 1 USD = {formatNumber(convertUsdToSos(1))} SOS</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Lacagaha La Ururiyey ee La Shaandheeyey</h2>
              <p className="text-sm text-medical-muted">
                Macaamiishii lacag bixiyey muddada maalinle, bille, sanadle, ama gaarka ah ee la doortay.
              </p>
            </div>

            {Array.isArray(report.customerCollections) && report.customerCollections.length > 0 ? (
              <div className="table-shell">
                <table className="data-table striped-table">
                  <thead>
                    <tr>
                      <th>Macmiil</th>
                      <th>Biil</th>
                      <th>Lacagta La Ururiyey</th>
                      <th>Qiimaha USD</th>
                      <th>La Bixiyey</th>
                      <th>Nooca</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.customerCollections.map((collection, index) => (
                      <tr key={`${collection.invoiceNumber || 'collection'}-${collection.paidAt || index}-${index}`}>
                        <td>{collection.customerName || 'Macmiil Toos U Yimid'}</td>
                        <td>{collection.invoiceNumber || 'Ma jiro'}</td>
                        <td className="font-semibold text-secondary">{formatMoney(collection.amount, collection.currency || currencyCode)}</td>
                        <td>{getUsdEquivalent(collection.amount, collection.currency || currencyCode, exchangeRate)}</td>
                        <td>{formatDateTime(collection.paidAt)}</td>
                        <td>
                          <span className="status-chip bg-secondary-light text-secondary">
                            {collection.source === 'INITIAL' ? 'Lacag-bixintii Hore' : 'Ururinta Daynta'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Shaandhadan lacag ururin macmiil kuma jiro"
                subtitle="Marka macaamiishu bixiyaan dayn muddadan la doortay, halkan ayay ka muuqan doonaan."
              />
            )}
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Iibsiyada Macaamiisha ee La Shaandheeyey</h2>
              <p className="text-sm text-medical-muted">
                Macaamiishii daawooyin iibsaday muddada warbixinta la doortay.
              </p>
            </div>

            {Array.isArray(report.customerPurchases) && report.customerPurchases.length > 0 ? (
              <div className="table-shell">
                <table className="data-table striped-table">
                  <thead>
                    <tr>
                      <th>Macmiil</th>
                      <th>Biil</th>
                      <th>Daawooyin</th>
                      <th>Nooca Lacag-bixinta</th>
                      <th>Wadar</th>
                      <th>Qiimaha USD</th>
                      <th>La Sameeyey</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.customerPurchases.map((purchase, index) => (
                      <tr key={`${purchase.invoiceNumber || 'purchase'}-${index}`}>
                        <td>{purchase.customerName || 'Macmiil Toos U Yimid'}</td>
                        <td>{purchase.invoiceNumber || 'Ma jiro'}</td>
                        <td className="max-w-md">{formatItems(purchase.items)}</td>
                        <td>
                          <span
                            className={`status-chip ${
                              purchase.paymentType === 'CREDIT'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-secondary-light text-secondary'
                            }`}
                          >
                            {PAYMENT_TYPE_LABELS[purchase.paymentType] || purchase.paymentType || 'Ma jiro'}
                          </span>
                        </td>
                        <td className="font-semibold">{formatMoney(purchase.totalAmount, purchase.currency || currencyCode)}</td>
                        <td>{getPurchaseUsdDisplay(purchase, exchangeRate, currencyCode, medicineLookup)}</td>
                        <td>{formatDateTime(purchase.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Shaandhadan wax iibsiyo macaamiil kuma jiraan"
                subtitle="Marka macaamiishu daawo iibsadaan muddadan la doortay, halkan ayay ka muuqan doonaan."
              />
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default ReportsView;

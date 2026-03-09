import { useEffect, useState } from 'react';
import axios from 'axios';
import { CalendarDays, CreditCard, RefreshCcw, TrendingUp, Users, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { convertSosToUsd, convertUsdToSos } from '../utils/currency';

const API_BASE_URL = 'http://localhost:5010';
const DEFAULT_SOS_PER_USD = 28;

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Number(value || 0));

const formatMoney = (value, currencyCode = 'SOS') => `${currencyCode} ${formatNumber(value)}`;

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
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';

  return date.toLocaleDateString();
};

const formatItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return 'No items';

  return items
    .map((item) => {
      const name = item.medicineName || item.name || item.medicine?.name || 'Medicine';
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
      label: `No activity in ${previousLabel.toLowerCase()}`,
    };
  }

  if (previous === 0) {
    return {
      tone: 'neutral',
      label: `No previous data for ${previousLabel.toLowerCase()}`,
    };
  }

  const diff = current - previous;
  const percent = (diff / previous) * 100;

  return {
    tone: diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral',
    label: `${diff >= 0 ? '+' : ''}${percent.toFixed(1)}% vs ${previousLabel.toLowerCase()}`,
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
      setError('Login token is missing.');
      setLoading(false);
      return;
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      setError('Select both start date and end date to load a custom report.');
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
      setError(requestError.response?.data?.message || 'Failed to load report data.');
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
    periodRange.previousLabel || 'previous period',
  );
  const salesComparison = getComparison(
    report?.totalRevenue,
    previous.totalRevenue,
    periodRange.previousLabel || 'previous period',
  );
  const profitComparison = getComparison(
    report?.totalProfit,
    previous.totalProfit,
    periodRange.previousLabel || 'previous period',
  );
  const ordersComparison = getComparison(
    report?.orderCount,
    previous.orderCount,
    periodRange.previousLabel || 'previous period',
  );

  const activeRangeLabel = hasDateRange
    ? `${startDate} to ${endDate}`
    : report
      ? `${formatDateOnly(periodRange.currentStart)} to ${formatDateOnly(
          new Date(new Date(periodRange.currentEnd).getTime() - 86400000),
        )}`
      : 'N/A';

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
                {hasDateRange ? 'Date Filter' : periodRange.currentLabel}: {activeRangeLabel}
              </p>
            ) : null}
          </div>

          <div className="grid w-full gap-3 md:grid-cols-4 lg:max-w-4xl">
            <div>
              <label htmlFor="report-period">Report Filter</label>
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
              <label htmlFor="report-start-date">From</label>
              <input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="report-end-date">To</label>
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
                {submitting ? 'Loading...' : 'Apply'}
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
                Clear Dates
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
          <p className="text-sm text-medical-muted">Loading report data...</p>
        </div>
      ) : null}

      {!loading && report ? (
        <>
          <div className="metrics-grid">
            <MetricCard
              icon={Wallet}
              label="Money Received"
              value={moneyReceivedDisplay.primary}
              secondaryValue={moneyReceivedDisplay.secondary}
              hint="Cash sales plus debt collections in the selected period."
              comparison={moneyComparison}
            />
            <MetricCard
              icon={CreditCard}
              label="Debt Collections"
              value={debtCollectionsDisplay.primary}
              secondaryValue={debtCollectionsDisplay.secondary}
              hint="Money paid later by customers with debt."
              comparison={getComparison(
                report.debtCollectionsAmount,
                previous.debtCollectionsAmount,
                periodRange.previousLabel || 'previous period',
              )}
            />
            <MetricCard
              icon={TrendingUp}
              label="Total Sales Value"
              value={totalRevenueDisplay.primary}
              secondaryValue={totalRevenueDisplay.secondary}
              hint="All invoices created in the selected period."
              comparison={salesComparison}
            />
            <MetricCard
              icon={Users}
              label="Net Profit"
              value={totalProfitDisplay.primary}
              secondaryValue={totalProfitDisplay.secondary}
              hint="Profit from sales booked in the selected period."
              comparison={profitComparison}
            />
          </div>

          <div className="metrics-grid">
            <MetricCard
              icon={CreditCard}
              label="Outstanding Debt"
              value={totalDebtDisplay.primary}
              secondaryValue={totalDebtDisplay.secondary}
              hint="Current unpaid debt still remaining in the system."
            />
            <MetricCard
              icon={Wallet}
              label="Cash Sales"
              value={cashRevenueDisplay.primary}
              secondaryValue={cashRevenueDisplay.secondary}
              hint="Cash invoices created in the selected period."
              comparison={getComparison(
                report.cashRevenue,
                previous.cashRevenue,
                periodRange.previousLabel || 'previous period',
              )}
            />
            <MetricCard
              icon={CreditCard}
              label="Credit Sales"
              value={creditRevenueDisplay.primary}
              secondaryValue={creditRevenueDisplay.secondary}
              hint="Credit invoices created in the selected period."
              comparison={getComparison(
                report.creditRevenue,
                previous.creditRevenue,
                periodRange.previousLabel || 'previous period',
              )}
            />
            <MetricCard
              icon={Users}
              label="Invoices"
              value={String(report.orderCount || 0)}
              hint="Number of sales in the selected period."
              comparison={ordersComparison}
            />
          </div>

          <div className="card">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Report Reading</h2>
                <p className="text-sm text-medical-muted">
                  USD in medicine purchases uses the medicine sale prices for the ordered amount whenever that price exists in your saved data.
                </p>
              </div>
              <div className="rounded-2xl bg-primary-light px-4 py-3 text-sm text-primary-dark">
                <p className="font-semibold">{hasDateRange ? 'Date Filter' : periodRange.currentLabel}</p>
                <p>{activeRangeLabel}</p>
                <p className="mt-1 text-xs text-medical-muted">USD conversion rate: 1 USD = {formatNumber(convertUsdToSos(1))} SOS</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Filtered Money Collections</h2>
              <p className="text-sm text-medical-muted">
                Customers who paid money during the selected daily, monthly, yearly, or custom time.
              </p>
            </div>

            {Array.isArray(report.customerCollections) && report.customerCollections.length > 0 ? (
              <div className="table-shell">
                <table className="data-table striped-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Amount Collected</th>
                      <th>USD Value</th>
                      <th>Paid At</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.customerCollections.map((collection, index) => (
                      <tr key={`${collection.invoiceNumber || 'collection'}-${collection.paidAt || index}-${index}`}>
                        <td>{collection.customerName || 'Walk-in Customer'}</td>
                        <td>{collection.invoiceNumber || 'N/A'}</td>
                        <td className="font-semibold text-secondary">{formatMoney(collection.amount, collection.currency || currencyCode)}</td>
                        <td>{getUsdEquivalent(collection.amount, collection.currency || currencyCode, exchangeRate)}</td>
                        <td>{formatDateTime(collection.paidAt)}</td>
                        <td>
                          <span className="status-chip bg-secondary-light text-secondary">
                            {collection.source === 'INITIAL' ? 'Initial Payment' : 'Debt Collection'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No customer collections in this filter"
                subtitle="When customers pay debt during the selected period, they will appear here."
              />
            )}
          </div>

          <div className="card">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Filtered Customer Purchases</h2>
              <p className="text-sm text-medical-muted">
                Customers who bought medicines in the selected report period.
              </p>
            </div>

            {Array.isArray(report.customerPurchases) && report.customerPurchases.length > 0 ? (
              <div className="table-shell">
                <table className="data-table striped-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Invoice</th>
                      <th>Medicines</th>
                      <th>Payment Type</th>
                      <th>Total</th>
                      <th>USD Value</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.customerPurchases.map((purchase, index) => (
                      <tr key={`${purchase.invoiceNumber || 'purchase'}-${index}`}>
                        <td>{purchase.customerName || 'Walk-in Customer'}</td>
                        <td>{purchase.invoiceNumber || 'N/A'}</td>
                        <td className="max-w-md">{formatItems(purchase.items)}</td>
                        <td>
                          <span
                            className={`status-chip ${
                              purchase.paymentType === 'CREDIT'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-secondary-light text-secondary'
                            }`}
                          >
                            {purchase.paymentType || 'N/A'}
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
                title="No customer purchases in this filter"
                subtitle="When customers buy medicine in the selected period, the purchases will appear here."
              />
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default ReportsView;

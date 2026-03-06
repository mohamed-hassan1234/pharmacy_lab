const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Sale = require('../models/Sale');
const Debt = require('../models/Debt');
const LabRequest = require('../models/LabRequest');
const Prescription = require('../models/Prescription');

const ALLOWED_ROLES = ['Admin', 'Cashier', 'Doctor', 'Lab Technician'];
const SOS_PER_USD = 28;

const clampNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const toUsd = (sos) => (clampNumber(sos) / SOS_PER_USD).toFixed(2);
const fmt = (value) => clampNumber(value).toLocaleString();
const money = (sos) => `${fmt(sos)} SOS (~$${toUsd(sos)} USD)`;

const detectLanguage = (message = '', preferred = '') => {
  if (preferred === 'so' || preferred === 'en') return preferred;
  const text = String(message).toLowerCase();
  const somaliHint = /(somali|soomaali|somalia|maxaa|sidee|fadlan|mahadsanid|bukaan|daawo|warbixin|iib|natiijo|shaybaar|caawi|dayn|lacag|waan|waxaan|ii|igu|mahadsanid|nidaam|xisaab|diiwaan|dhaqaale|dhakhtar|shaybaar)/i;
  return somaliHint.test(text) ? 'so' : 'en';
};

const inferIntent = (message = '', currentPath = '') => {
  const text = String(message || '').toLowerCase().trim();
  const path = String(currentPath || '').toLowerCase();

  if (!text) {
    if (path.includes('/reports')) return 'reports';
    if (path.includes('/medicines')) return 'medicines';
    if (path.includes('/consult')) return 'consultation';
    if (path.includes('/lab/tests')) return 'lab';
    if (path.includes('/register') || path.includes('/patients')) return 'patients';
    return 'overview';
  }

  if (/(what.*sold today|today.*sold|sold today|today sales|today sale|iibka maanta|maanta la iibiyey|maanta iib|what did we sell today)/i.test(text)) return 'sold_today';
  if (/(difference.*today.*yesterday.*(sold|sales|sale|profit|revenue|money)|today.*yesterday.*(sold|sales|profit|revenue)|farqiga.*maanta.*shalay.*(iib|faa.?iido|lacag)|isbarbar.*maanta.*shalay)/i.test(text)) return 'profit_compare';
  if (/(system status|system health|status of system|xaalada nidaamka|xaaladda nidaamka|nidaamka xaaladiisa|nidaam status)/i.test(text)) return 'system_status';
  if (/(today.*yesterday|yesterday.*today|compare|difference|diff|farqi|isbarbar|faa.?iido|profit.*yesterday|benefit.*yesterday|profit comparison)/i.test(text)) return 'profit_compare';
  if (/(daily|weekly|monthly|yearly|maalinle|usbuucle|todobaadle|bille|sanadle|yearly report|weekly report|daily report|monthly report)/i.test(text) && /(report|warbixin|profit|revenue|sales|iib|faa.?iido)/i.test(text)) return 'period_report';
  if (/(hello|hi|salam|asc|asalaam|nabad|help)/i.test(text)) return 'overview';
  if (/(dashboard|overview|summary|stats|tirakoob|xog)/i.test(text)) return 'overview';
  if (/(register|patient|bukaan|diiwaan|name|phone|address|age|sex)/i.test(text)) return 'patients';
  if (/(medicine|inventory|stock|daawo|supplier|expiry)/i.test(text)) return 'medicines';
  if (/(sale|sales|sold|solds|pos|invoice|cash|credit|debt|dayn|pay|payment|iib|lacag)/i.test(text)) return 'sales';
  if (/(lab|test|result|ticket|awaiting doctor|shaybaar|natiijo)/i.test(text)) return 'lab';
  if (/(consult|diagnosis|prescription|doctor|qor|daaweyn)/i.test(text)) return 'consultation';
  if (/(report|profit|revenue|usd|sos|table|warbixin)/i.test(text)) return 'reports';
  if (/(sidebar|menu|navigation|switch|role|dashboard view)/i.test(text)) return 'navigation';

  return 'unknown';
};

const isOutOfScopeQuestion = (message = '', intent = 'unknown') => {
  const text = String(message || '').trim();
  if (!text) return false;
  return intent === 'unknown';
};

const getRoleHelp = (role, lang) => {
  if (lang === 'so') {
    if (role === 'Cashier') return 'Doorkaaga: Cashier. Waxaad maamuli kartaa diiwaangelinta bukaanka, iibka POS, daawooyinka, daynta, iyo warbixinnada.';
    if (role === 'Doctor') return 'Doorkaaga: Doctor. Waxaad maamuli kartaa consultation, diagnosis, prescription, iyo dib-u-eegista natiijooyinka lab-ka.';
    if (role === 'Lab Technician') return 'Doorkaaga: Lab Technician. Waxaad geli kartaa natiijooyinka, maamuli kartaa tigidhada lab-ka, kana diri kartaa doctor.';
    return 'Doorkaaga: Admin. Waxaad arki kartaa dhammaan shaqaalaha, maaliyadda, bakhaarka, iyo socodka nidaamka.';
  }

  if (role === 'Cashier') return 'Your role: Cashier. You can register patients, process POS sales, manage medicines, debts, and reports.';
  if (role === 'Doctor') return 'Your role: Doctor. You can run consultations, create prescriptions, and review lab outcomes.';
  if (role === 'Lab Technician') return 'Your role: Lab Technician. You can enter lab results, manage tickets, and send completed tests to doctor.';
  return 'Your role: Admin. You can monitor staff, finance, inventory, and full clinic workflow.';
};

const getRoleRouteHints = (role, lang) => {
  if (lang === 'so') {
    if (role === 'Cashier') return ['`/cashier/register` bukaanka cusub', '`/cashier/sales` iib POS', '`/cashier/reports` warbixin lacageed'];
    if (role === 'Doctor') return ['`/doctor` liiska bukaanada', '`/doctor/consult` consultation & prescription', '`/profile` xogtaada'];
    if (role === 'Lab Technician') return ['`/lab` dashboard', '`/lab/tests` gelinta natiijo', '`/lab/tests?status=Awaiting Doctor` kuwa doctor sugaya'];
    return ['`/admin` guudmar', '`/admin/staff` shaqaalaha', '`/admin/inventory` bakhaar'];
  }

  if (role === 'Cashier') return ['`/cashier/register` for new patient', '`/cashier/sales` for POS sale', '`/cashier/reports` for financial report'];
  if (role === 'Doctor') return ['`/doctor` for patient queue', '`/doctor/consult` for consultation/prescription', '`/profile` for your account'];
  if (role === 'Lab Technician') return ['`/lab` for dashboard', '`/lab/tests` to enter results', '`/lab/tests?status=Awaiting Doctor` for doctor queue'];
  return ['`/admin` for overview', '`/admin/staff` for users', '`/admin/inventory` for stock'];
};

const getSuggestions = (role, lang) => {
  if (lang === 'so') {
    if (role === 'Cashier') return ['Sidee baan bukaan u diiwaangeliyaa?', 'I tus xaaladda nidaamka', 'Maanta iyo shalay profit farqigooda i tus', 'Warbixin daily/weekly/monthly/yearly i sii'];
    if (role === 'Doctor') return ['Sidee consultation loo dhammeeyaa?', 'Natiijooyinka doctor sugaya imisa?', 'Xaaladda nidaamka i tus', 'Warbixin monthly i sii'];
    if (role === 'Lab Technician') return ['Sidee natiijo loo geliyaa?', 'Ticket-yada paid imisa?', 'Lab status sidee loo fahmaa?', 'Warbixin weekly i sii'];
    return ['Ii soo koob xaaladda nidaamka', 'Profit maanta vs shalay i tus', 'Warbixin daily/weekly/monthly/yearly', 'Inventory status i tus'];
  }

  if (role === 'Cashier') return ['How do I register a patient?', 'Show system status', 'Compare today vs yesterday profit', 'Give daily/weekly/monthly/yearly report'];
  if (role === 'Doctor') return ['How do I finalize consultation?', 'How many are awaiting doctor?', 'Show system status', 'Give monthly report'];
  if (role === 'Lab Technician') return ['How do I enter lab results?', 'How many paid tickets now?', 'Explain lab statuses', 'Give weekly report'];
  return ['Show system status', 'Compare today vs yesterday profit', 'Give daily/weekly/monthly/yearly report', 'Show inventory health'];
};

const getOutOfScopeAnswer = (lang) => {
  if (lang === 'so') {
    return '🤖🙇 Waan ka xumahay. Su’aashan kuma xirna nidaamka Pharmacy/Laboratory-gaaga.\n\nFadlan i weydii su’aal ku saabsan system-kaaga (patients, medicines, sales, reports, lab, consultation, roles).';
  }
  return '🤖🙇 Sorry. This question is not related to your Pharmacy/Laboratory system.\n\nPlease ask about your system only (patients, medicines, sales, reports, lab, consultation, roles).';
};

const buildSnapshot = async (user) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const nearExpiryDate = new Date(now);
  nearExpiryDate.setDate(nearExpiryDate.getDate() + 30);

  const salesFilter = user.role === 'Cashier' ? { cashierId: user._id } : {};
  const doctorFilter = user.role === 'Doctor' ? { doctorId: user._id } : {};

  const [
    patientsTotal,
    waitingForDoctor,
    medicinesTotal,
    lowStockMedicines,
    expiredMedicines,
    nearExpiryMedicines,
    openDebtsCount,
    openDebtValueAgg,
    salesTodayAgg,
    salesTodayCount,
    labAwaitingPayment,
    labPaid,
    labAwaitingDoctor,
    labCompleted,
    labToday,
    myLabAwaitingDoctor,
    prescriptionsIssued,
    prescriptionsDispensed,
    myIssuedPrescriptions,
    latestSale,
    latestLab
  ] = await Promise.all([
    Patient.countDocuments({ status: 'Active' }),
    Patient.countDocuments({ visitStatus: 'Waiting for Doctor', status: 'Active' }),
    Medicine.countDocuments(),
    Medicine.countDocuments({ totalUnitsInStock: { $lt: 5 } }),
    Medicine.countDocuments({ expiryDate: { $lt: now } }),
    Medicine.countDocuments({ expiryDate: { $gte: now, $lte: nearExpiryDate } }),
    Debt.countDocuments({ status: { $ne: 'PAID' } }),
    Debt.aggregate([
      { $match: { status: { $ne: 'PAID' } } },
      { $group: { _id: null, total: { $sum: '$remainingBalance' } } }
    ]),
    Sale.aggregate([
      { $match: { ...salesFilter, createdAt: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]),
    Sale.countDocuments({ ...salesFilter, createdAt: { $gte: startOfToday } }),
    LabRequest.countDocuments({ status: 'Awaiting Payment' }),
    LabRequest.countDocuments({ status: 'Paid' }),
    LabRequest.countDocuments({ status: 'Awaiting Doctor' }),
    LabRequest.countDocuments({ status: 'Completed' }),
    LabRequest.countDocuments({ createdAt: { $gte: startOfToday } }),
    LabRequest.countDocuments({ doctorId: user._id, status: 'Awaiting Doctor' }),
    Prescription.countDocuments({ status: 'Issued' }),
    Prescription.countDocuments({ status: 'Dispensed' }),
    Prescription.countDocuments({ doctorId: user._id, status: 'Issued' }),
    Sale.findOne(salesFilter).sort({ createdAt: -1 }).select('invoiceNumber customerName totalAmount paymentType createdAt'),
    LabRequest.findOne(doctorFilter).sort({ createdAt: -1 }).select('ticketNumber patientName status createdAt')
  ]);

  return {
    patientsTotal,
    waitingForDoctor,
    medicinesTotal,
    lowStockMedicines,
    expiredMedicines,
    nearExpiryMedicines,
    openDebtsCount,
    openDebtValue: openDebtValueAgg[0]?.total || 0,
    salesToday: salesTodayAgg[0]?.total || 0,
    salesTodayCount,
    labAwaitingPayment,
    labPaid,
    labAwaitingDoctor,
    labCompleted,
    labToday,
    myLabAwaitingDoctor,
    prescriptionsIssued,
    prescriptionsDispensed,
    myIssuedPrescriptions,
    latestSale: latestSale || null,
    latestLab: latestLab || null
  };
};

const getPeriodFromMessage = (message = '') => {
  const text = String(message || '').toLowerCase();
  const hasDaily = /(daily|today|maalin|maalinle|maanta)/i.test(text);
  const hasYesterday = /(yesterday|shalay)/i.test(text);
  const hasWeekly = /(weekly|week|todobaad|usbuuc|usbuucle)/i.test(text);
  const hasMonthly = /(monthly|month|bil|bille)/i.test(text);
  const hasYearly = /(yearly|year|sanad|sanadle)/i.test(text);

  const hitCount = [hasDaily, hasYesterday, hasWeekly, hasMonthly, hasYearly].filter(Boolean).length;
  if (hitCount > 1) return 'all';
  if (hasYesterday) return 'yesterday';
  if (hasWeekly) return 'weekly';
  if (hasMonthly) return 'monthly';
  if (hasYearly) return 'yearly';
  return 'daily';
};

const getRange = (period, now = new Date()) => {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  if (period === 'daily') return { label: 'Daily', start: startOfDay, end: endOfDay };
  if (period === 'yesterday') {
    const start = new Date(startOfDay);
    start.setDate(start.getDate() - 1);
    return { label: 'Yesterday', start, end: startOfDay };
  }

  if (period === 'weekly') {
    const weekday = (now.getDay() + 6) % 7;
    const start = new Date(startOfDay);
    start.setDate(start.getDate() - weekday);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { label: 'Weekly', start, end };
  }

  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { label: 'Monthly', start, end };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { label: 'Yearly', start, end };
};

const getPreviousRange = (period, now = new Date()) => {
  if (period === 'daily') {
    const current = getRange('daily', now);
    const start = new Date(current.start);
    start.setDate(start.getDate() - 1);
    const end = new Date(current.start);
    return { label: 'Yesterday', start, end };
  }

  if (period === 'yesterday') {
    const current = getRange('yesterday', now);
    const start = new Date(current.start);
    start.setDate(start.getDate() - 1);
    const end = new Date(current.start);
    return { label: 'Day Before Yesterday', start, end };
  }

  if (period === 'weekly') {
    const current = getRange('weekly', now);
    const start = new Date(current.start);
    start.setDate(start.getDate() - 7);
    const end = new Date(current.start);
    return { label: 'Previous Week', start, end };
  }

  if (period === 'monthly') {
    const current = getRange('monthly', now);
    const start = new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1);
    const end = new Date(current.start.getFullYear(), current.start.getMonth(), 1);
    return { label: 'Previous Month', start, end };
  }

  const current = getRange('yearly', now);
  const start = new Date(current.start.getFullYear() - 1, 0, 1);
  const end = new Date(current.start.getFullYear(), 0, 1);
  return { label: 'Previous Year', start, end };
};

const getSalesFilterByRole = (user) => (user.role === 'Cashier' ? { cashierId: user._id } : {});

const aggregateSalesByRange = async (salesFilter, start, end) => {
  const rows = await Sale.aggregate([
    { $match: { ...salesFilter, createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        profit: { $sum: '$profit' },
        cost: { $sum: '$totalCost' },
        orders: { $sum: 1 }
      }
    }
  ]);

  return {
    revenue: rows[0]?.revenue || 0,
    profit: rows[0]?.profit || 0,
    cost: rows[0]?.cost || 0,
    orders: rows[0]?.orders || 0
  };
};

const buildPeriodReport = async (user, period) => {
  const now = new Date();
  const salesFilter = getSalesFilterByRole(user);
  const currentRange = getRange(period, now);
  const previousRange = getPreviousRange(period, now);

  const [current, previous] = await Promise.all([
    aggregateSalesByRange(salesFilter, currentRange.start, currentRange.end),
    aggregateSalesByRange(salesFilter, previousRange.start, previousRange.end)
  ]);

  return { currentRange, previousRange, current, previous };
};

const wantsSummaryFromQuestion = (message = '') => {
  const text = String(message || '').toLowerCase();
  return /(summary|stats|statistics|report|overview|today|how many|count|show me|i tus|ii soo koob|tirakoob|xog|immisa|maanta|warbixin)/i.test(text);
};

const isHowToQuestion = (message = '') => /(how|sidee|steps|habka|method|procedure)/i.test(String(message || ''));
const isSalesMetricQuestion = (message = '') => /(sold|sales|iib|today|maanta|revenue|profit|money|lacag|usd|sos|yesterday|shalay|difference|farqi)/i.test(String(message || ''));

const formatDiff = (current, previous) => {
  const diff = current - previous;
  const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : Math.round((Math.abs(diff) / Math.abs(previous)) * 100);
  return { diff, direction, pct };
};

const lineForPeriod = (label, data) => `${label}: Revenue ${money(data.revenue)}, Profit ${money(data.profit)}, Cost ${money(data.cost)}, Orders ${fmt(data.orders)}`;

const buildReply = ({ lang, intent, role, snapshot, message, reportData, allReportData }) => {
  const isSomali = lang === 'so';
  const includeSummary = wantsSummaryFromQuestion(message);

  if (intent === 'patients') {
    const base = isSomali
      ? 'Diiwaangelinta bukaanka:\n1) Tag `/cashier/register`.\n2) Geli Full Name, Age, Sex, Phone, Address.\n3) Guji Save/Register.'
      : 'Patient registration:\n1) Go to `/cashier/register`.\n2) Fill Full Name, Age, Sex, Phone, Address.\n3) Click Save/Register.';
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nXog gaaban: bukaan active ${fmt(snapshot.patientsTotal)}.`
      : `${base}\n\nQuick data: active patients ${fmt(snapshot.patientsTotal)}.`;
  }

  if (intent === 'medicines') {
    const base = isSomali
      ? 'Maamulka daawooyinka:\n1) Tag `/cashier/medicines`.\n2) Geli supplier, prices, units per box, boxes bought, expiry.\n3) Save si stock-ku u cusboonaado.'
      : 'Medicine management:\n1) Open `/cashier/medicines`.\n2) Enter supplier, prices, units per box, boxes bought, expiry.\n3) Save to update stock.';
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nStock: low ${fmt(snapshot.lowStockMedicines)}, expired ${fmt(snapshot.expiredMedicines)}, near expiry ${fmt(snapshot.nearExpiryMedicines)}.`
      : `${base}\n\nStock: low ${fmt(snapshot.lowStockMedicines)}, expired ${fmt(snapshot.expiredMedicines)}, near expiry ${fmt(snapshot.nearExpiryMedicines)}.`;
  }

  if (intent === 'sales') {
    const base = isSomali
      ? 'Iibka POS:\n1) Tag `/cashier/sales`.\n2) Dooro daawo (BOX ama UNIT) + quantity.\n3) Dooro CASH ama CREDIT.\n4) Confirm si invoice loo abuuro.'
      : 'POS sales:\n1) Go to `/cashier/sales`.\n2) Select medicine (BOX or UNIT) + quantity.\n3) Choose CASH or CREDIT.\n4) Confirm to create invoice.';
    const metricMode = isSalesMetricQuestion(message) && !isHowToQuestion(message);

    if (metricMode && reportData?.current) {
      const current = reportData.current;
      return isSomali
        ? `Maanta waxaad iibisay ${fmt(current.orders)} invoice.\nRevenue: ${money(current.revenue)}\nProfit/Benefit: ${money(current.profit)}\nCost: ${money(current.cost)}\nDayn furan: ${money(snapshot.openDebtValue)}`
        : `Today you sold ${fmt(current.orders)} invoices.\nRevenue: ${money(current.revenue)}\nProfit/Benefit: ${money(current.profit)}\nCost: ${money(current.cost)}\nOpen debt: ${money(snapshot.openDebtValue)}`;
    }

    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nMaanta: ${fmt(snapshot.salesTodayCount)} invoice, iib ${money(snapshot.salesToday)}, dayn ${money(snapshot.openDebtValue)}.`
      : `${base}\n\nToday: ${fmt(snapshot.salesTodayCount)} invoices, sales ${money(snapshot.salesToday)}, debt ${money(snapshot.openDebtValue)}.`;
  }

  if (intent === 'sold_today') {
    const current = reportData?.current || { revenue: snapshot.salesToday, profit: 0, cost: 0, orders: snapshot.salesTodayCount };
    return isSomali
      ? `Maanta waxaad iibisay ${fmt(current.orders)} invoice.\nRevenue: ${money(current.revenue)}\nProfit/Benefit: ${money(current.profit)}\nCost: ${money(current.cost)}`
      : `Today you sold ${fmt(current.orders)} invoices.\nRevenue: ${money(current.revenue)}\nProfit/Benefit: ${money(current.profit)}\nCost: ${money(current.cost)}`;
  }

  if (intent === 'lab') {
    const base = isSomali
      ? 'Socodka Lab:\n1) Awaiting Payment -> lacag bixin.\n2) Paid/In Progress -> result geli.\n3) Awaiting Doctor -> doctor review.\n4) Completed -> final report.'
      : 'Lab flow:\n1) Awaiting Payment -> payment.\n2) Paid/In Progress -> enter results.\n3) Awaiting Doctor -> doctor review.\n4) Completed -> final report.';
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nQueue: Awaiting Payment ${fmt(snapshot.labAwaitingPayment)}, Paid ${fmt(snapshot.labPaid)}, Awaiting Doctor ${fmt(snapshot.labAwaitingDoctor)}, Completed ${fmt(snapshot.labCompleted)}.`
      : `${base}\n\nQueue: Awaiting Payment ${fmt(snapshot.labAwaitingPayment)}, Paid ${fmt(snapshot.labPaid)}, Awaiting Doctor ${fmt(snapshot.labAwaitingDoctor)}, Completed ${fmt(snapshot.labCompleted)}.`;
  }

  if (intent === 'consultation') {
    const base = isSomali
      ? 'Consultation:\n1) Tag `/doctor/consult`.\n2) Qor diagnosis + physical exam.\n3) Ku dar medicines + dosage/duration.\n4) Finalize si pharmacy loo diro.'
      : 'Consultation:\n1) Open `/doctor/consult`.\n2) Enter diagnosis + physical exam.\n3) Add medicines + dosage/duration.\n4) Finalize to send to pharmacy.';
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nDoctor queue: Awaiting Doctor ${fmt(snapshot.myLabAwaitingDoctor)}, Issued prescriptions ${fmt(snapshot.myIssuedPrescriptions)}.`
      : `${base}\n\nDoctor queue: Awaiting Doctor ${fmt(snapshot.myLabAwaitingDoctor)}, Issued prescriptions ${fmt(snapshot.myIssuedPrescriptions)}.`;
  }

  if (intent === 'reports') {
    const base = isSomali
      ? 'Reports:\n1) Tag `/cashier/reports`.\n2) Fiiri SOS iyo USD columns.\n3) Hubi Cost Value, Actual Revenue, Real Profit.'
      : 'Reports:\n1) Go to `/cashier/reports`.\n2) Read SOS and USD columns.\n3) Check Cost Value, Actual Revenue, Real Profit.';
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nMaanta: iib ${money(snapshot.salesToday)}, dayn ${money(snapshot.openDebtValue)}.`
      : `${base}\n\nToday: sales ${money(snapshot.salesToday)}, debt ${money(snapshot.openDebtValue)}.`;
  }

  if (intent === 'system_status') {
    if (isSomali) {
      return `Xaaladda nidaamka hadda:\n- Bukaanno active: ${fmt(snapshot.patientsTotal)}\n- Daawooyin: ${fmt(snapshot.medicinesTotal)}\n- Low stock: ${fmt(snapshot.lowStockMedicines)}\n- Lab Awaiting Doctor: ${fmt(snapshot.labAwaitingDoctor)}\n- Dayn furan: ${money(snapshot.openDebtValue)}\n- Iibka maanta: ${money(snapshot.salesToday)}`;
    }
    return `System status now:\n- Active patients: ${fmt(snapshot.patientsTotal)}\n- Medicines: ${fmt(snapshot.medicinesTotal)}\n- Low stock: ${fmt(snapshot.lowStockMedicines)}\n- Lab awaiting doctor: ${fmt(snapshot.labAwaitingDoctor)}\n- Open debt: ${money(snapshot.openDebtValue)}\n- Today sales: ${money(snapshot.salesToday)}`;
  }

  if (intent === 'profit_compare') {
    const today = allReportData?.daily?.current || reportData?.current;
    const yesterday = allReportData?.daily?.previous || reportData?.previous;
    const profitDiff = formatDiff(today?.profit || 0, yesterday?.profit || 0);
    const revenueDiff = formatDiff(today?.revenue || 0, yesterday?.revenue || 0);
    const orderDiff = formatDiff(today?.orders || 0, yesterday?.orders || 0);

    if (isSomali) {
      return `Maanta vs Shalay:\n- Sold today: ${fmt(today?.orders || 0)} invoice\n- Sold yesterday: ${fmt(yesterday?.orders || 0)} invoice\n- Farqiga sold: ${fmt(orderDiff.diff)} (${orderDiff.pct}% ${orderDiff.direction === 'up' ? 'koror' : orderDiff.direction === 'down' ? 'hoos u dhac' : 'isku mid'})\n\n- Revenue maanta: ${money(today?.revenue || 0)}\n- Revenue shalay: ${money(yesterday?.revenue || 0)}\n- Farqiga revenue: ${money(revenueDiff.diff)} (${revenueDiff.pct}% ${revenueDiff.direction === 'up' ? 'koror' : revenueDiff.direction === 'down' ? 'hoos u dhac' : 'isku mid'})\n\n- Profit maanta: ${money(today?.profit || 0)}\n- Profit shalay: ${money(yesterday?.profit || 0)}\n- Farqiga profit: ${money(profitDiff.diff)} (${profitDiff.pct}% ${profitDiff.direction === 'up' ? 'koror' : profitDiff.direction === 'down' ? 'hoos u dhac' : 'isku mid'})`;
    }

    return `Today vs Yesterday:\n- Sold today: ${fmt(today?.orders || 0)} invoices\n- Sold yesterday: ${fmt(yesterday?.orders || 0)} invoices\n- Sales count difference: ${fmt(orderDiff.diff)} (${orderDiff.pct}% ${orderDiff.direction})\n\n- Today revenue: ${money(today?.revenue || 0)}\n- Yesterday revenue: ${money(yesterday?.revenue || 0)}\n- Revenue difference: ${money(revenueDiff.diff)} (${revenueDiff.pct}% ${revenueDiff.direction})\n\n- Today profit: ${money(today?.profit || 0)}\n- Yesterday profit: ${money(yesterday?.profit || 0)}\n- Profit difference: ${money(profitDiff.diff)} (${profitDiff.pct}% ${profitDiff.direction})`;
  }

  if (intent === 'period_report') {
    if (allReportData) {
      if (isSomali) {
        return `Warbixinta period-yada:\n${lineForPeriod('Daily', allReportData.daily.current)}\n${lineForPeriod('Weekly', allReportData.weekly.current)}\n${lineForPeriod('Monthly', allReportData.monthly.current)}\n${lineForPeriod('Yearly', allReportData.yearly.current)}`;
      }
      return `Period reports:\n${lineForPeriod('Daily', allReportData.daily.current)}\n${lineForPeriod('Weekly', allReportData.weekly.current)}\n${lineForPeriod('Monthly', allReportData.monthly.current)}\n${lineForPeriod('Yearly', allReportData.yearly.current)}`;
    }

    const currentLabel = reportData?.currentRange?.label || 'Current Period';
    const previousLabel = reportData?.previousRange?.label || 'Previous Period';
    const current = reportData?.current || { revenue: 0, profit: 0, cost: 0, orders: 0 };
    const previous = reportData?.previous || { revenue: 0, profit: 0, cost: 0, orders: 0 };
    const profitDiff = formatDiff(current.profit, previous.profit);
    const revenueDiff = formatDiff(current.revenue, previous.revenue);

    if (isSomali) {
      return `${currentLabel} report:\n- Revenue: ${money(current.revenue)}\n- Profit/Benefit: ${money(current.profit)}\n- Cost: ${money(current.cost)}\n- Orders: ${fmt(current.orders)}\n\nMarka la barbar dhigo ${previousLabel}:\n- Profit farqi: ${money(profitDiff.diff)} (${profitDiff.pct}% ${profitDiff.direction === 'up' ? 'koror' : profitDiff.direction === 'down' ? 'hoos u dhac' : 'isku mid'})\n- Revenue farqi: ${money(revenueDiff.diff)} (${revenueDiff.pct}% ${revenueDiff.direction === 'up' ? 'koror' : revenueDiff.direction === 'down' ? 'hoos u dhac' : 'isku mid'})`;
    }
    return `${currentLabel} report:\n- Revenue: ${money(current.revenue)}\n- Profit/Benefit: ${money(current.profit)}\n- Cost: ${money(current.cost)}\n- Orders: ${fmt(current.orders)}\n\nCompared to ${previousLabel}:\n- Profit diff: ${money(profitDiff.diff)} (${profitDiff.pct}% ${profitDiff.direction})\n- Revenue diff: ${money(revenueDiff.diff)} (${revenueDiff.pct}% ${revenueDiff.direction})`;
  }

  if (intent === 'navigation') {
    const routes = getRoleRouteHints(role, lang).join(' | ');
    return isSomali
      ? `Navigation: Sidebar-ka bidix ka dooro module-kaaga.\nRoutes degdeg ah: ${routes}.`
      : `Navigation: Use the left sidebar for your modules.\nQuick routes: ${routes}.`;
  }

  if (intent === 'overview') {
    return isSomali
      ? 'Salaan. Waxaan ku caawinayaa nidaamkaaga. Waxaad cod ama qoraal ku weydiin kartaa: status-ka nidaamka, profit maanta vs shalay, ama warbixin daily/weekly/monthly/yearly.'
      : 'Hello. I help with your system. Ask by voice or text about system status, today vs yesterday profit, or daily/weekly/monthly/yearly reports.';
  }

  return getOutOfScopeAnswer(lang);
};

router.post('/chat', protect, authorize(...ALLOWED_ROLES), async (req, res) => {
  try {
    const { message = '', language = 'auto', currentPath = '', history = [] } = req.body || {};
    const safeMessage = String(message || '').trim().slice(0, 1200);
    const safePath = String(currentPath || '').slice(0, 200);
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    void safeHistory;

    const lang = detectLanguage(safeMessage, language);
    const intent = inferIntent(safeMessage, safePath);
    const outOfScope = isOutOfScopeQuestion(safeMessage, intent);

    if (outOfScope) {
      return res.json({
        language: lang,
        answer: getOutOfScopeAnswer(lang),
        suggestions: getSuggestions(req.user.role, lang),
        snapshot: null
      });
    }

    const snapshot = await buildSnapshot(req.user);
    const requestedPeriod = getPeriodFromMessage(safeMessage);
    let reportData = null;
    let allReportData = null;

    if (intent === 'profit_compare') {
      reportData = await buildPeriodReport(req.user, 'daily');
    } else if (intent === 'sold_today') {
      reportData = await buildPeriodReport(req.user, 'daily');
    } else if (intent === 'period_report') {
      if (requestedPeriod === 'all') {
        const [daily, weekly, monthly, yearly] = await Promise.all([
          buildPeriodReport(req.user, 'daily'),
          buildPeriodReport(req.user, 'weekly'),
          buildPeriodReport(req.user, 'monthly'),
          buildPeriodReport(req.user, 'yearly')
        ]);
        allReportData = { daily, weekly, monthly, yearly };
      } else {
        reportData = await buildPeriodReport(req.user, requestedPeriod);
      }
    } else if (intent === 'sales' && wantsSummaryFromQuestion(safeMessage)) {
      reportData = await buildPeriodReport(req.user, 'daily');
    }

    const answer = buildReply({
      lang,
      intent,
      role: req.user.role,
      snapshot,
      message: safeMessage,
      reportData,
      allReportData
    });

    res.json({
      language: lang,
      answer,
      suggestions: getSuggestions(req.user.role, lang),
      snapshot: {
        patientsTotal: snapshot.patientsTotal,
        medicinesTotal: snapshot.medicinesTotal,
        salesToday: snapshot.salesToday,
        openDebtValue: snapshot.openDebtValue,
        labAwaitingDoctor: snapshot.labAwaitingDoctor
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Assistant failed to respond' });
  }
});

module.exports = router;

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
const SOS_PER_USD = 28000;

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

  if (/(hello|hi|salam|asc|asalaam|nabad|help)/i.test(text)) return 'overview';
  if (/(dashboard|overview|summary|stats|tirakoob|xog)/i.test(text)) return 'overview';
  if (/(register|patient|bukaan|diiwaan|name|phone|address|age|sex)/i.test(text)) return 'patients';
  if (/(medicine|inventory|stock|daawo|supplier|expiry)/i.test(text)) return 'medicines';
  if (/(sale|pos|invoice|cash|credit|debt|dayn|pay|payment|iib|lacag)/i.test(text)) return 'sales';
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
    if (role === 'Cashier') return ['Sidee baan bukaan u diiwaangeliyaa?', 'I tus iibka maanta', 'Dayn intee leeg ayaa taagan?', 'Warbixinta USD sidee loo akhriyaa?'];
    if (role === 'Doctor') return ['Sidee consultation loo dhammeeyaa?', 'Natiijooyinka doctor sugaya imisa?', 'Prescription sidee loo diraa?', 'Bukaanada maanta i tus'];
    if (role === 'Lab Technician') return ['Sidee natiijo loo geliyaa?', 'Ticket-yada paid imisa?', 'Sidee doctor loogu diraa?', 'Lab status sidee loo fahmaa?'];
    return ['Ii soo koob dashboard-ka', 'Staff active/suspended i tus', 'Inventory status i tus', 'System workflow sharax'];
  }

  if (role === 'Cashier') return ['How do I register a patient?', 'Show today sales summary', 'How much debt is outstanding?', 'How to read USD in reports?'];
  if (role === 'Doctor') return ['How do I finalize consultation?', 'How many are awaiting doctor?', 'How to send prescription?', 'Show my today queue'];
  if (role === 'Lab Technician') return ['How do I enter lab results?', 'How many paid tickets now?', 'How to send to doctor?', 'Explain lab statuses'];
  return ['Give me dashboard summary', 'Show active vs suspended staff', 'Show inventory health', 'Explain system workflow'];
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

const wantsSummaryFromQuestion = (message = '') => {
  const text = String(message || '').toLowerCase();
  return /(summary|stats|statistics|report|overview|today|how many|count|show me|i tus|ii soo koob|tirakoob|xog|immisa|maanta|warbixin)/i.test(text);
};

const buildReply = ({ lang, intent, role, snapshot, message }) => {
  const isSomali = lang === 'so';
  const includeSummary = wantsSummaryFromQuestion(message);
  void role;

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
    if (!includeSummary) return base;
    return isSomali
      ? `${base}\n\nMaanta: ${fmt(snapshot.salesTodayCount)} invoice, iib ${money(snapshot.salesToday)}, dayn ${money(snapshot.openDebtValue)}.`
      : `${base}\n\nToday: ${fmt(snapshot.salesTodayCount)} invoices, sales ${money(snapshot.salesToday)}, debt ${money(snapshot.openDebtValue)}.`;
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

  if (intent === 'navigation') {
    const routes = getRoleRouteHints(role, lang).join(' | ');
    return isSomali
      ? `Navigation: Sidebar-ka bidix ka dooro module-kaaga.\nRoutes degdeg ah: ${routes}.`
      : `Navigation: Use the left sidebar for your modules.\nQuick routes: ${routes}.`;
  }

  if (intent === 'overview') {
    return isSomali
      ? 'Waxaan ku caawinayaa su’aalaha nidaamkaaga. Weydii su’aal gaar ah, tusaale: "Sidee baan bukaan u diiwaangeliyaa?"'
      : 'I can help with your system. Ask a specific question, for example: "How do I register a patient?"';
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
    const answer = buildReply({
      lang,
      intent,
      role: req.user.role,
      snapshot,
      message: safeMessage
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

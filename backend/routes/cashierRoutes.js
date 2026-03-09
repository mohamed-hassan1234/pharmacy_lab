const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const LabRequest = require('../models/LabRequest');

const Prescription = require('../models/Prescription');
const REPORT_PERIODS = new Set(['daily', 'weekly', 'monthly', 'yearly']);
const CASHIER_REPORT_SOS_PER_USD = Number(process.env.SOS_PER_USD || 57000);

const parseDateOnly = (value) => {
    if (!value || typeof value !== 'string') return null;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }
    return date;
};

const getPeriodRanges = (period, now = new Date()) => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'daily') {
        const currentStart = startOfToday;
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 1);
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
        return {
            currentStart,
            currentEnd,
            previousStart,
            previousEnd: currentStart,
            currentLabel: 'Today',
            previousLabel: 'Yesterday'
        };
    }

    if (period === 'weekly') {
        const weekday = (now.getDay() + 6) % 7; // Monday = 0
        const currentStart = new Date(startOfToday);
        currentStart.setDate(currentStart.getDate() - weekday);
        const currentEnd = new Date(currentStart);
        currentEnd.setDate(currentEnd.getDate() + 7);
        const previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        return {
            currentStart,
            currentEnd,
            previousStart,
            previousEnd: currentStart,
            currentLabel: 'This Week',
            previousLabel: 'Last Week'
        };
    }

    if (period === 'monthly') {
        const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return {
            currentStart,
            currentEnd,
            previousStart,
            previousEnd: currentStart,
            currentLabel: 'This Month',
            previousLabel: 'Last Month'
        };
    }

    const currentStart = new Date(now.getFullYear(), 0, 1);
    const currentEnd = new Date(now.getFullYear() + 1, 0, 1);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd: currentStart,
        currentLabel: 'This Year',
        previousLabel: 'Last Year'
    };
};

const getCustomRanges = (startDate, endDate) => {
    const currentStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const currentEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const previousEnd = currentStart;
    const previousStart = new Date(previousEnd.getTime() - durationMs);

    return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currentLabel: 'Selected Range',
        previousLabel: 'Previous Range'
    };
};

const summarizeSales = (sales = []) => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalProfit = sales.reduce((acc, s) => acc + s.profit, 0);
    const totalCost = sales.reduce((acc, s) => acc + s.totalCost, 0);
    const cashRevenue = sales.filter(s => s.paymentType === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
    const creditRevenue = sales.filter(s => s.paymentType === 'CREDIT').reduce((acc, s) => acc + s.totalAmount, 0);

    return {
        totalRevenue,
        totalProfit,
        totalCost,
        cashRevenue,
        creditRevenue,
        orderCount: sales.length
    };
};

const normalizeReportCurrency = (value, fallback = 'SOS') => {
    if (!value || typeof value !== 'string') return fallback;

    const normalized = value.trim().toUpperCase();
    if (normalized === 'USD' || normalized === '$') return 'USD';
    if (normalized === 'SOS' || normalized === 'SHILLING' || normalized === 'SHILLINGS') return 'SOS';

    return fallback;
};

const createReportCurrencyBucket = () => ({
    SOS: 0,
    USD: 0
});

const getReportSaleCurrency = (sale = {}) => {
    const directCurrency = normalizeReportCurrency(
        sale.currency ||
        sale.currencyCode ||
        sale.saleCurrency ||
        sale.totalCurrency ||
        sale.pricingCurrency,
        null
    );

    if (directCurrency) {
        return directCurrency;
    }

    const itemCurrencies = Array.isArray(sale.items)
        ? sale.items
            .map((item) => normalizeReportCurrency(
                item?.currency ||
                item?.currencyCode ||
                item?.saleCurrency ||
                item?.priceCurrency ||
                item?.unitCurrency,
                null
            ))
            .filter(Boolean)
        : [];

    if (itemCurrencies.length > 0 && itemCurrencies.every((currency) => currency === itemCurrencies[0])) {
        return itemCurrencies[0];
    }

    return 'SOS';
};

const getReportDebtCurrency = (debt = {}) => normalizeReportCurrency(
    debt.currency ||
    debt.currencyCode ||
    debt.saleCurrency ||
    debt.balanceCurrency,
    'SOS'
);

const summarizeReportCurrencyTotals = (sales = [], debts = [], paymentEvents = []) => {
    const totals = {
        totalRevenue: createReportCurrencyBucket(),
        totalProfit: createReportCurrencyBucket(),
        totalCost: createReportCurrencyBucket(),
        cashRevenue: createReportCurrencyBucket(),
        creditRevenue: createReportCurrencyBucket(),
        totalDebts: createReportCurrencyBucket(),
        debtCollectionsAmount: createReportCurrencyBucket(),
        actualMoneyReceived: createReportCurrencyBucket()
    };

    sales.forEach((sale) => {
        const currency = getReportSaleCurrency(sale);
        const totalAmount = Number(sale.totalAmount) || 0;
        const totalProfit = Number(sale.profit) || 0;
        const totalCost = Number(sale.totalCost) || 0;

        totals.totalRevenue[currency] += totalAmount;
        totals.totalProfit[currency] += totalProfit;
        totals.totalCost[currency] += totalCost;

        if (sale.paymentType === 'CASH') {
            totals.cashRevenue[currency] += totalAmount;
            totals.actualMoneyReceived[currency] += totalAmount;
        } else if (sale.paymentType === 'CREDIT') {
            totals.creditRevenue[currency] += totalAmount;
        }
    });

    debts
        .filter((debt) => debt.status !== 'PAID')
        .forEach((debt) => {
            const currency = getReportDebtCurrency(debt);
            totals.totalDebts[currency] += Number(debt.remainingBalance) || 0;
        });

    paymentEvents.forEach((entry) => {
        const currency = normalizeReportCurrency(entry.currency, 'SOS');
        const amount = Number(entry.amount) || 0;
        totals.debtCollectionsAmount[currency] += amount;
        totals.actualMoneyReceived[currency] += amount;
    });

    return totals;
};

const reportToNumber = (...values) => {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number)) {
            return number;
        }
    }

    return 0;
};

const reportAlmostEqual = (left, right, epsilon = 0.01) => Math.abs(left - right) <= epsilon;

const getReportItemQuantity = (item = {}) => {
    const quantity = reportToNumber(
        item.quantity,
        item.units,
        item.unitsSold,
        item.boxes,
        item.qty,
        1
    );

    return quantity > 0 ? quantity : 1;
};

const normalizeReportMedicineName = (value) => String(value || '')
    .toLowerCase()
    .replace(/\sx\d+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getReportMedicineLookup = (medicines = []) => {
    const byId = new Map();
    const byName = new Map();
    const entries = [];

    medicines.forEach((medicine) => {
        if (medicine?._id) {
            byId.set(String(medicine._id), medicine);
        }

        [
            medicine?.name,
            medicine?.medicineName,
            medicine?.productName,
            medicine?.title
        ]
            .filter(Boolean)
            .forEach((value) => {
                const rawName = String(value).trim().toLowerCase();
                const normalizedName = normalizeReportMedicineName(value);
                byName.set(rawName, medicine);

                if (normalizedName) {
                    byName.set(normalizedName, medicine);
                    entries.push({ normalizedName, medicine });
                }
            });
    });

    return { byId, byName, entries };
};

const getReportMedicineForItem = (item = {}, medicineLookup = { byId: new Map(), byName: new Map(), entries: [] }) => {
    const candidateIds = [
        item.medicineId,
        item.medicine,
        item.medicine?._id,
        item.medicine?._id?.toString?.(),
        item.productId,
        item.itemId
    ].filter(Boolean);

    for (const candidateId of candidateIds) {
        const foundById = medicineLookup.byId.get(String(candidateId));
        if (foundById) {
            return foundById;
        }
    }

    const candidateNames = [
        item.medicineName,
        item.name,
        typeof item.medicine === 'string' ? item.medicine : null,
        item.medicine?.name,
        item.productName,
        item.title
    ].filter(Boolean);

    for (const candidateName of candidateNames) {
        const rawName = String(candidateName).trim().toLowerCase();
        const normalizedName = normalizeReportMedicineName(candidateName);
        const foundByName = medicineLookup.byName.get(rawName) || medicineLookup.byName.get(normalizedName);
        if (foundByName) {
            return foundByName;
        }

        const fuzzyMatch = medicineLookup.entries.find(({ normalizedName: entryName }) =>
            entryName === normalizedName ||
            entryName.includes(normalizedName) ||
            normalizedName.includes(entryName)
        );

        if (fuzzyMatch) {
            return fuzzyMatch.medicine;
        }
    }

    return null;
};

const flattenReportNumericEntries = (value, prefix = '', seen = new Set()) => {
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
            return flattenReportNumericEntries(nestedValue, nextKey, seen);
        }

        return [];
    });
};

const findReportMedicinePrice = (medicine, keywordGroups) => {
    const numericEntries = flattenReportNumericEntries(medicine);

    for (const keywords of keywordGroups) {
        const match = numericEntries.find(({ key }) => keywords.every((keyword) => key.includes(keyword)));
        if (match && match.value > 0) {
            return match.value;
        }
    }

    return 0;
};

const inferReportItemUsdAmount = (item = {}, medicine) => {
    const quantity = getReportItemQuantity(item);

    const directUsdTotal = reportToNumber(
        item.totalPriceUSD,
        item.totalAmountUSD,
        item.lineTotalUSD,
        item.subtotalUSD
    );

    if (directUsdTotal > 0) {
        return directUsdTotal;
    }

    const directUsdUnitPrice = reportToNumber(
        item.unitPriceUSD,
        item.priceUSD,
        item.sellingPricePerUnitUSD
    );

    if (directUsdUnitPrice > 0) {
        return directUsdUnitPrice * quantity;
    }

    const directUsdBoxPrice = reportToNumber(
        item.boxPriceUSD,
        item.sellingPricePerBoxUSD
    );

    const lineTotalSOS = reportToNumber(
        item.totalPrice,
        item.totalAmount,
        item.lineTotal,
        item.subtotal
    );

    const unitPriceSOS = reportToNumber(
        item.unitPrice,
        item.price,
        item.unitPriceSOS,
        item.priceSOS,
        item.sellingPricePerUnitSOS
    );

    if (directUsdBoxPrice > 0) {
        const mode = String(item.saleUnit || item.unitType || item.quantityType || '').toUpperCase();
        if (mode === 'BOX' || mode === 'BOXES') {
            return directUsdBoxPrice * quantity;
        }
    }

    if (!medicine) {
        return 0;
    }

    const medicineBoxUsd = reportToNumber(
        medicine.sellingPricePerBoxUSD,
        medicine.salePricePerBoxUSD,
        findReportMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
    );
    const medicineUnitUsd = reportToNumber(
        medicine.sellingPricePerUnitUSD,
        medicine.salePricePerUnitUSD,
        findReportMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
    );
    const medicineBoxSos = reportToNumber(
        medicine.sellingPricePerBoxSOS,
        medicine.salePricePerBoxSOS,
        findReportMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
    );
    const medicineUnitSos = reportToNumber(
        medicine.sellingPricePerUnitSOS,
        medicine.salePricePerUnitSOS,
        findReportMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
    );
    const mode = String(item.saleUnit || item.unitType || item.quantityType || '').toUpperCase();

    if ((mode === 'BOX' || mode === 'BOXES') && medicineBoxUsd > 0) {
        return medicineBoxUsd * quantity;
    }

    if ((mode === 'UNIT' || mode === 'PILL' || mode === 'PIECE') && medicineUnitUsd > 0) {
        return medicineUnitUsd * quantity;
    }

    if (lineTotalSOS > 0 && medicineBoxSos > 0 && medicineBoxUsd > 0 && reportAlmostEqual(lineTotalSOS, medicineBoxSos * quantity)) {
        return medicineBoxUsd * quantity;
    }

    if (lineTotalSOS > 0 && medicineUnitSos > 0 && medicineUnitUsd > 0 && reportAlmostEqual(lineTotalSOS, medicineUnitSos * quantity)) {
        return medicineUnitUsd * quantity;
    }

    if (unitPriceSOS > 0 && medicineBoxSos > 0 && medicineBoxUsd > 0 && reportAlmostEqual(unitPriceSOS, medicineBoxSos)) {
        return medicineBoxUsd * quantity;
    }

    if (unitPriceSOS > 0 && medicineUnitSos > 0 && medicineUnitUsd > 0 && reportAlmostEqual(unitPriceSOS, medicineUnitSos)) {
        return medicineUnitUsd * quantity;
    }

    return 0;
};

const inferReportUsdFromSaleTotal = (sale = {}, item = {}, medicine) => {
    if (!medicine) {
        return 0;
    }

    const quantity = getReportItemQuantity(item);
    const saleTotalSOS = reportToNumber(sale.totalAmount);

    if (saleTotalSOS <= 0) {
        return 0;
    }

    const medicineBoxUsd = reportToNumber(
        medicine.sellingPricePerBoxUSD,
        medicine.salePricePerBoxUSD,
        findReportMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
    );
    const medicineUnitUsd = reportToNumber(
        medicine.sellingPricePerUnitUSD,
        medicine.salePricePerUnitUSD,
        findReportMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
    );
    const medicineBoxSos = reportToNumber(
        medicine.sellingPricePerBoxSOS,
        medicine.salePricePerBoxSOS,
        findReportMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
    );
    const medicineUnitSos = reportToNumber(
        medicine.sellingPricePerUnitSOS,
        medicine.salePricePerUnitSOS,
        findReportMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
    );

    if (medicineBoxSos > 0 && medicineBoxUsd > 0 && reportAlmostEqual(saleTotalSOS, medicineBoxSos * quantity)) {
        return medicineBoxUsd * quantity;
    }

    if (medicineUnitSos > 0 && medicineUnitUsd > 0 && reportAlmostEqual(saleTotalSOS, medicineUnitSos * quantity)) {
        return medicineUnitUsd * quantity;
    }

    return 0;
};

const getReportSaleUsdAmount = (sale = {}, medicineLookup) => {
    const saleCurrency = getReportSaleCurrency(sale);
    const totalAmount = reportToNumber(sale.totalAmount);

    if (saleCurrency === 'USD' && totalAmount > 0) {
        return totalAmount;
    }

    if (!Array.isArray(sale.items) || sale.items.length === 0) {
        return 0;
    }

    if (sale.items.length === 1) {
        const item = sale.items[0];
        const medicine = getReportMedicineForItem(item, medicineLookup);
        const directItemUsd = inferReportItemUsdAmount(item, medicine);

        if (directItemUsd > 0) {
            return directItemUsd;
        }

        const saleMatchedUsd = inferReportUsdFromSaleTotal(sale, item, medicine);
        if (saleMatchedUsd > 0) {
            return saleMatchedUsd;
        }
    }

    return sale.items.reduce((acc, item) => {
        const medicine = getReportMedicineForItem(item, medicineLookup);
        return acc + inferReportItemUsdAmount(item, medicine);
    }, 0);
};

const getReportSalePricingSnapshot = (sale = {}, medicineLookup) => {
    if (!Array.isArray(sale.items) || sale.items.length !== 1) {
        return null;
    }

    const item = sale.items[0];
    const medicine = getReportMedicineForItem(item, medicineLookup);

    if (!medicine) {
        return null;
    }

    return {
        medicineName: medicine.name || medicine.medicineName || medicine.productName || '',
        quantity: getReportItemQuantity(item),
        sellingPricePerBoxUSD: reportToNumber(
            medicine.sellingPricePerBoxUSD,
            medicine.salePricePerBoxUSD,
            findReportMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
        ),
        sellingPricePerUnitUSD: reportToNumber(
            medicine.sellingPricePerUnitUSD,
            medicine.salePricePerUnitUSD,
            findReportMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
        ),
        sellingPricePerBoxSOS: reportToNumber(
            medicine.sellingPricePerBoxSOS,
            medicine.salePricePerBoxSOS,
            findReportMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
        ),
        sellingPricePerUnitSOS: reportToNumber(
            medicine.sellingPricePerUnitSOS,
            medicine.salePricePerUnitSOS,
            findReportMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
        )
    };
};

const getDebtPaymentEvents = (debts = []) => debts.flatMap((debt) => {
    const history = Array.isArray(debt.paymentHistory) ? debt.paymentHistory : [];

    if (history.length > 0) {
        return history.map((entry) => ({
            debtId: debt._id,
            customerId: debt.customerId || null,
            customerName: debt.customerName,
            invoiceNumber: debt.invoiceNumber,
            amount: Number(entry.amount) || 0,
            paidAt: entry.paidAt || debt.updatedAt || debt.createdAt,
            source: entry.source || 'COLLECTION',
            currency: normalizeReportCurrency(entry.currency || debt.currency || debt.currencyCode || debt.saleCurrency, 'SOS')
        }));
    }

    if ((Number(debt.paidAmount) || 0) > 0) {
        return [{
            debtId: debt._id,
            customerId: debt.customerId || null,
            customerName: debt.customerName,
            invoiceNumber: debt.invoiceNumber,
            amount: Number(debt.paidAmount) || 0,
            paidAt: debt.createdAt,
            source: 'INITIAL',
            currency: getReportDebtCurrency(debt)
        }];
    }

    return [];
});

const sumPaymentsInRange = (debts = [], start, end) => getDebtPaymentEvents(debts)
    .filter((entry) => {
        const paidAt = new Date(entry.paidAt);
        return paidAt >= start && paidAt < end;
    });

// Process Sale (BOX or UNIT logic)
router.post('/sales', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { items, customerName, customerId, paymentType, paidAmount = 0, prescriptionId, labRequestId } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('No medicines selected for sale');
        }

        let linkedPrescription = null;
        if (prescriptionId) {
            linkedPrescription = await Prescription.findById(prescriptionId).populate('patientId', 'name');
            if (!linkedPrescription) throw new Error('Prescription not found');
            if (linkedPrescription.status !== 'Issued') {
                throw new Error('Prescription already dispensed');
            }
        }

        const resolvedCustomerName =
            (customerName && customerName.trim()) ||
            linkedPrescription?.patientId?.name ||
            'Walk-in Customer';

        let totalAmount = 0;
        let totalCost = 0;
        const saleItems = [];

        for (const item of items) {
            const med = await Medicine.findById(item.medicineId);
            if (!med) throw new Error(`Medicine ${item.name} not found`);

            let totalUnitsSold = 0;
            if (item.sellType === 'BOX') {
                totalUnitsSold = item.quantity * med.unitsPerBox;
            } else {
                totalUnitsSold = item.quantity;
            }

            if (med.totalUnitsInStock < totalUnitsSold) {
                throw new Error(`Insufficient stock for ${med.name}`);
            }

            const boxPrice = med.sellingPricePerBox || (med.sellingPricePerUnit * med.unitsPerBox);
            const lineTotal = item.quantity * (item.sellType === 'BOX' ? boxPrice : med.sellingPricePerUnit);

            // Cost calculation based on purchase price per unit
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            const lineCost = totalUnitsSold * purchasePricePerUnit;

            totalAmount += lineTotal;
            totalCost += lineCost;

            saleItems.push({
                medicineId: med._id,
                name: med.name,
                sellType: item.sellType,
                quantity: item.quantity,
                unitPrice: item.sellType === 'BOX' ? boxPrice : med.sellingPricePerUnit,
                total: lineTotal
            });

            // Update Stock
            med.totalUnitsInStock -= totalUnitsSold;
            med.boxesInStock = Math.floor(med.totalUnitsInStock / med.unitsPerBox);
            await med.save();
        }

        const saleCount = await Sale.countDocuments();
        const invoiceNumber = `INV-${(saleCount + 1).toString().padStart(4, '0')}`;

        const normalizedPaidAmount = Math.max(0, Number(paidAmount) || 0);
        if (paymentType === 'CREDIT' && normalizedPaidAmount > totalAmount) {
            throw new Error('Paid amount cannot be greater than the total amount');
        }

        const remainingBalance = Math.max(totalAmount - normalizedPaidAmount, 0);

        const sale = await Sale.create({
            invoiceNumber,
            cashierId: req.user._id,
            customerId,
            prescriptionId: prescriptionId || null,
            labRequestId: labRequestId || null,
            customerName: resolvedCustomerName,
            items: saleItems,
            totalAmount,
            totalCost,
            profit: totalAmount - totalCost,
            paymentType,
            status: paymentType === 'CASH' || remainingBalance === 0 ? 'PAID' : (normalizedPaidAmount > 0 ? 'PARTIAL' : 'UNPAID')
        });

        // Handle Credit (Debt)
        let debtRecord = null;
        if (paymentType === 'CREDIT') {
            if (remainingBalance > 0) {
                debtRecord = await Debt.create({
                    customerId: customerId || null,
                    customerName: resolvedCustomerName,
                    invoiceNumber,
                    saleId: sale._id,
                    totalAmount,
                    paidAmount: normalizedPaidAmount,
                    remainingBalance,
                    status: normalizedPaidAmount === 0 ? 'UNPAID' : 'PARTIAL',
                    paymentHistory: normalizedPaidAmount > 0
                        ? [{
                            amount: normalizedPaidAmount,
                            paidAt: new Date(),
                            source: 'INITIAL',
                            note: 'Initial payment during credit sale'
                        }]
                        : []
                });
            }
        }

        // Update Prescription Status if applicable
        if (prescriptionId) {
            await Prescription.findByIdAndUpdate(prescriptionId, { status: 'Dispensed' });
        }

        if (labRequestId) {
            await LabRequest.findByIdAndUpdate(labRequestId, {
                dispensedSaleId: sale._id,
                dispensedAt: new Date(),
                dispensedBy: req.user._id
            });
        }

        const saleResponse = sale.toObject();
        saleResponse.paymentSummary = {
            paidAmount: paymentType === 'CASH' ? totalAmount : normalizedPaidAmount,
            remainingBalance,
            status: sale.status
        };
        if (debtRecord) {
            saleResponse.debt = {
                _id: debtRecord._id,
                invoiceNumber: debtRecord.invoiceNumber,
                totalAmount: debtRecord.totalAmount,
                paidAmount: debtRecord.paidAmount,
                remainingBalance: debtRecord.remainingBalance,
                status: debtRecord.status
            };
        }

        res.status(201).json(saleResponse);

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get Debts
router.get('/debts', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const debts = await Debt.find().sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register a new customer
// @route   POST /api/cashier/customers
router.post('/customers', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { name, phone } = req.body;
        const customer = await Customer.create({ name, phone, addedBy: req.user._id });
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get all customers
router.get('/customers', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        const outstandingDebts = await Debt.find({ status: { $ne: 'PAID' } })
            .select('customerId customerName remainingBalance')
            .lean();

        const debtByCustomerId = new Map();
        const debtByCustomerName = new Map();

        outstandingDebts.forEach((debt) => {
            const amount = Number(debt.remainingBalance) || 0;
            if (debt.customerId) {
                const key = debt.customerId.toString();
                debtByCustomerId.set(key, (debtByCustomerId.get(key) || 0) + amount);
                return;
            }

            const nameKey = (debt.customerName || '').trim().toLowerCase();
            if (nameKey) {
                debtByCustomerName.set(nameKey, (debtByCustomerName.get(nameKey) || 0) + amount);
            }
        });

        const customersWithDebt = customers.map((customer) => {
            const idKey = customer._id.toString();
            const nameKey = (customer.name || '').trim().toLowerCase();
            const outstandingDebt = (debtByCustomerId.get(idKey) || 0) + (debtByCustomerName.get(nameKey) || 0);
            const customerObject = customer.toObject();

            return {
                ...customerObject,
                outstandingDebt,
                debtStatus: outstandingDebt > 0 ? 'HAS_DEBT' : 'NO_DEBT'
            };
        });

        res.json(customersWithDebt);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Cashier Dashboard Stats
router.get('/dashboard', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        // Total Customers
        const totalCustomers = await Customer.countDocuments();

        // Total Suppliers
        const totalSuppliers = await Supplier.countDocuments();

        // All Medicines
        const allMedicines = await Medicine.find();
        const medicineLookup = getReportMedicineLookup(allMedicines);

        // Out of Stock (less than 5 units)
        const outOfStock = allMedicines.filter(m => m.totalUnitsInStock < 5).length;

        // Expired Medicines
        const today = new Date();
        const expiredMedicines = allMedicines.filter(m => new Date(m.expiryDate) < today).length;

        // Near Expiry (within 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const nearExpiry = allMedicines.filter(m => {
            const expiry = new Date(m.expiryDate);
            return expiry > today && expiry <= thirtyDaysFromNow;
        }).length;

        // Sales Data
        const allSales = await Sale.find({ cashierId: req.user._id });
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = allSales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = allSales.reduce((acc, s) => acc + s.totalCost, 0);

        // Debts
        const debts = await Debt.find({ status: { $ne: 'PAID' } });
        const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);

        // Monthly Data for Charts (Last 12 months)
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthSales = await Sale.find({
                cashierId: req.user._id,
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });

            const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
            const monthProfit = monthSales.reduce((acc, s) => acc + s.profit, 0);
            const monthCost = monthSales.reduce((acc, s) => acc + s.totalCost, 0);

            monthlyData.push({
                month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue,
                profit: monthProfit,
                cost: monthCost,
                sales: monthSales.length
            });
        }

        // Top Selling Medicines
        const salesWithItems = await Sale.find({ cashierId: req.user._id });
        const medicineStats = {};

        salesWithItems.forEach(sale => {
            sale.items.forEach(item => {
                if (!medicineStats[item.name]) {
                    medicineStats[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                }
                medicineStats[item.name].quantity += item.quantity;
                medicineStats[item.name].revenue += item.total;
            });
        });

        const topMedicines = Object.values(medicineStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        res.json({
            totalCustomers,
            totalSuppliers,
            outOfStock,
            expiredMedicines,
            nearExpiry,
            totalRevenue,
            totalProfit,
            totalCost,
            totalDebts,
            monthlyData,
            topMedicines,
            totalMedicines: allMedicines.length,
            totalSales: allSales.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// Get Cashier Reports
router.get('/reports', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        const requestedPeriod = String(req.query.period || 'daily').toLowerCase();
        const period = REPORT_PERIODS.has(requestedPeriod) ? requestedPeriod : 'daily';
        const startDateQuery = req.query.startDate ? String(req.query.startDate) : '';
        const endDateQuery = req.query.endDate ? String(req.query.endDate) : '';

        let ranges = getPeriodRanges(period);
        let filterMode = 'period';

        if (startDateQuery || endDateQuery) {
            if (!startDateQuery || !endDateQuery) {
                return res.status(400).json({ message: 'Both startDate and endDate are required for date filtering.' });
            }

            const startDate = parseDateOnly(startDateQuery);
            const endDate = parseDateOnly(endDateQuery);

            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
            }
            if (endDate < startDate) {
                return res.status(400).json({ message: 'endDate must be on or after startDate.' });
            }

            ranges = getCustomRanges(startDate, endDate);
            filterMode = 'custom';
        }

        const sales = await Sale.find({
            cashierId: req.user._id,
            createdAt: { $gte: ranges.currentStart, $lt: ranges.currentEnd }
        });

        const previousSales = await Sale.find({
            cashierId: req.user._id,
            createdAt: { $gte: ranges.previousStart, $lt: ranges.previousEnd }
        });

        const debts = await Debt.find();
        const currentSummary = summarizeSales(sales);
        const previousSummary = summarizeSales(previousSales);
        const currentDebtPayments = sumPaymentsInRange(debts, ranges.currentStart, ranges.currentEnd);
        const previousDebtPayments = sumPaymentsInRange(debts, ranges.previousStart, ranges.previousEnd);
        const currencyTotals = summarizeReportCurrencyTotals(sales, debts, currentDebtPayments);
        const previousCurrencyTotals = summarizeReportCurrencyTotals(previousSales, debts, previousDebtPayments);
        const debtCollectionsAmount = currentDebtPayments.reduce((acc, entry) => acc + entry.amount, 0);
        const previousDebtCollectionsAmount = previousDebtPayments.reduce((acc, entry) => acc + entry.amount, 0);
        const actualMoneyReceived = currentSummary.cashRevenue + debtCollectionsAmount;
        const previousActualMoneyReceived = previousSummary.cashRevenue + previousDebtCollectionsAmount;

        const totalRevenue = currentSummary.totalRevenue;
        const totalProfit = currentSummary.totalProfit;
        const totalCost = currentSummary.totalCost;
        const totalDebts = debts
            .filter((debt) => debt.status !== 'PAID')
            .reduce((acc, d) => acc + d.remainingBalance, 0);
        const cashRevenue = currentSummary.cashRevenue;
        const creditRevenue = currentSummary.creditRevenue;

        // REAL-TIME INVENTORY AUDIT (TRUSTED DATA)
        const allMeds = await Medicine.find();
        let investedStockValue = 0;
        let totalFullBoxes = 0;
        let totalLoosePills = 0;

        allMeds.forEach(med => {
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            const currentStockValue = med.totalUnitsInStock * purchasePricePerUnit;
            investedStockValue += currentStockValue;
            totalFullBoxes += med.boxesInStock;
            totalLoosePills += (med.totalUnitsInStock % med.unitsPerBox);
        });

        const recentTransactions = await Sale.find({
            cashierId: req.user._id,
            createdAt: { $gte: ranges.currentStart, $lt: ranges.currentEnd }
        })
            .populate({
                path: 'prescriptionId',
                select: 'diagnosis physicalExamination patientId',
                populate: { path: 'patientId', select: 'name patientId' }
            })
            .populate('labRequestId', 'patientName doctorConclusion physicalExamination')
            .sort({ createdAt: -1 })
            .limit(20);

        const patientMedicinePurchases = recentTransactions
            .filter((sale) => sale.prescriptionId || sale.labRequestId)
            .map((sale) => ({
                invoiceNumber: sale.invoiceNumber,
                patientName: sale.prescriptionId?.patientId?.name || sale.labRequestId?.patientName || sale.customerName,
                diagnosis: sale.prescriptionId?.diagnosis || sale.labRequestId?.doctorConclusion || '',
                physicalExamination: sale.prescriptionId?.physicalExamination || sale.labRequestId?.physicalExamination || '',
                paymentType: sale.paymentType,
                totalAmount: sale.totalAmount,
                items: sale.items,
                createdAt: sale.createdAt
            }));

        const medicineLookup = getReportMedicineLookup(await Medicine.find());

        const customerPurchases = sales
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((sale) => ({
                invoiceNumber: sale.invoiceNumber,
                customerName: sale.customerName,
                currency: getReportSaleCurrency(sale),
                paymentType: sale.paymentType,
                totalAmount: sale.totalAmount,
                usdTotalAmount: getReportSaleUsdAmount(sale, medicineLookup),
                pricingSnapshot: getReportSalePricingSnapshot(sale, medicineLookup),
                items: sale.items,
                createdAt: sale.createdAt
            }));

        const customerCollections = currentDebtPayments
            .slice()
            .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
            .map((entry) => ({
                customerName: entry.customerName,
                invoiceNumber: entry.invoiceNumber,
                currency: normalizeReportCurrency(entry.currency, 'SOS'),
                amount: entry.amount,
                paidAt: entry.paidAt,
                source: entry.source
            }));

        res.json({
            period,
            filterMode,
            periodRange: {
                currentLabel: ranges.currentLabel,
                previousLabel: ranges.previousLabel,
                currentStart: ranges.currentStart,
                currentEnd: ranges.currentEnd,
                previousStart: ranges.previousStart,
                previousEnd: ranges.previousEnd,
                startDate: startDateQuery || null,
                endDate: endDateQuery || null
            },
            exchangeRate: CASHIER_REPORT_SOS_PER_USD,
            totalRevenue,
            totalProfit,
            totalCost,
            totalDebts,
            cashRevenue,
            creditRevenue,
            debtCollectionsAmount,
            actualMoneyReceived,
            currencyTotals,
            orderCount: currentSummary.orderCount,
            previous: {
                totalRevenue: previousSummary.totalRevenue,
                totalProfit: previousSummary.totalProfit,
                totalCost: previousSummary.totalCost,
                cashRevenue: previousSummary.cashRevenue,
                creditRevenue: previousSummary.creditRevenue,
                debtCollectionsAmount: previousDebtCollectionsAmount,
                actualMoneyReceived: previousActualMoneyReceived,
                currencyTotals: previousCurrencyTotals,
                orderCount: previousSummary.orderCount
            },
            investedStockValue, // Money currently sitting on the shelf
            totalFullBoxes,
            totalLoosePills,
            recentTransactions,
            customerPurchases,
            customerCollections,
            patientMedicinePurchases
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all pending debts (Dayn)
router.get('/debts', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const debts = await Debt.find({ status: { $ne: 'PAID' } }).sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Pay off a debt (Collect money)
router.patch('/debts/:id', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const { amountPaid } = req.body;
        const debt = await Debt.findById(req.params.id);

        if (!debt) return res.status(404).json({ message: 'Debt record not found' });

        const payment = Number(amountPaid);
        if (!Number.isFinite(payment) || payment <= 0) {
            return res.status(400).json({ message: 'Amount paid must be greater than 0' });
        }
        if (payment > debt.remainingBalance) {
            return res.status(400).json({ message: 'Amount paid cannot be greater than remaining debt' });
        }

        debt.paidAmount = (Number(debt.paidAmount) || 0) + payment;
        debt.remainingBalance = Math.max((Number(debt.remainingBalance) || 0) - payment, 0);
        debt.status = debt.remainingBalance === 0 ? 'PAID' : 'PARTIAL';
        debt.paymentHistory = Array.isArray(debt.paymentHistory) ? debt.paymentHistory : [];
        debt.paymentHistory.push({
            amount: payment,
            paidAt: new Date(),
            source: 'COLLECTION',
            note: 'Debt collection payment'
        });

        await debt.save();
        res.json(debt);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get All Prescriptions for Cashier
router.get('/prescriptions', protect, authorize('Cashier', 'Admin'), async (req, res) => {
    try {
        const prescriptions = await Prescription.find({ status: 'Issued' })
            .populate('patientId', 'name patientId')
            .populate('doctorId', 'name')
            .sort({ createdAt: -1 });
        res.json(prescriptions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;


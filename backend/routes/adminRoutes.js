const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Sale = require('../models/Sale');
const Medicine = require('../models/Medicine');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Debt = require('../models/Debt');
const Patient = require('../models/Patient');
const LabRequest = require('../models/LabRequest');
const Prescription = require('../models/Prescription');
const {
    cleanString,
    normalizeEmail,
    isValidEmail,
    assertStrongPassword,
    generateTemporaryPassword
} = require('../utils/security');

const STAFF_ROLES = ['Cashier', 'Doctor', 'Lab Technician'];
const REPORT_PERIODS = new Set(['daily', 'weekly', 'monthly', 'yearly']);
const SOS_PER_USD = Number(process.env.SOS_PER_USD || 57000);

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
        const weekday = (now.getDay() + 6) % 7;
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
    const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const totalProfit = sales.reduce((acc, sale) => acc + sale.profit, 0);
    const totalCost = sales.reduce((acc, sale) => acc + sale.totalCost, 0);
    const cashRevenue = sales
        .filter((sale) => sale.paymentType === 'CASH')
        .reduce((acc, sale) => acc + sale.totalAmount, 0);
    const creditRevenue = sales
        .filter((sale) => sale.paymentType === 'CREDIT')
        .reduce((acc, sale) => acc + sale.totalAmount, 0);

    return {
        totalRevenue,
        totalProfit,
        totalCost,
        cashRevenue,
        creditRevenue,
        orderCount: sales.length
    };
};

const SUPPORTED_CURRENCIES = ['SOS', 'USD'];

const normalizeCurrency = (value, fallback = 'SOS') => {
    if (!value || typeof value !== 'string') return fallback;

    const normalized = value.trim().toUpperCase();
    if (normalized === 'USD' || normalized === '$') return 'USD';
    if (normalized === 'SOS' || normalized === 'SHILLING' || normalized === 'SHILLINGS') return 'SOS';

    return fallback;
};

const createCurrencyBucket = () => ({
    SOS: 0,
    USD: 0
});

const getSaleCurrency = (sale = {}) => {
    const directCurrency = normalizeCurrency(
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
            .map((item) => normalizeCurrency(
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

const getDebtCurrency = (debt = {}) => normalizeCurrency(
    debt.currency ||
    debt.currencyCode ||
    debt.saleCurrency ||
    debt.balanceCurrency,
    'SOS'
);

const summarizeCurrencyTotals = (sales = [], debts = [], paymentEvents = []) => {
    const totals = {
        totalRevenue: createCurrencyBucket(),
        totalProfit: createCurrencyBucket(),
        totalCost: createCurrencyBucket(),
        cashRevenue: createCurrencyBucket(),
        creditRevenue: createCurrencyBucket(),
        totalDebts: createCurrencyBucket(),
        debtCollectionsAmount: createCurrencyBucket(),
        actualMoneyReceived: createCurrencyBucket()
    };

    sales.forEach((sale) => {
        const currency = getSaleCurrency(sale);
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
            const currency = getDebtCurrency(debt);
            totals.totalDebts[currency] += Number(debt.remainingBalance) || 0;
        });

    paymentEvents.forEach((entry) => {
        const currency = normalizeCurrency(entry.currency, 'SOS');
        const amount = Number(entry.amount) || 0;
        totals.debtCollectionsAmount[currency] += amount;
        totals.actualMoneyReceived[currency] += amount;
    });

    return totals;
};

const toNumber = (...values) => {
    for (const value of values) {
        const number = Number(value);
        if (Number.isFinite(number)) {
            return number;
        }
    }

    return 0;
};

const almostEqual = (left, right, epsilon = 0.01) => Math.abs(left - right) <= epsilon;

const getItemQuantity = (item = {}) => {
    const quantity = toNumber(
        item.quantity,
        item.units,
        item.unitsSold,
        item.boxes,
        item.qty,
        1
    );

    return quantity > 0 ? quantity : 1;
};

const normalizeMedicineName = (value) => String(value || '')
    .toLowerCase()
    .replace(/\sx\d+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getMedicineLookup = (medicines = []) => {
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
                const normalizedName = normalizeMedicineName(value);
                byName.set(rawName, medicine);

                if (normalizedName) {
                    byName.set(normalizedName, medicine);
                    entries.push({ normalizedName, medicine });
                }
            });
    });

    return { byId, byName, entries };
};

const getMedicineForItem = (item = {}, medicineLookup = { byId: new Map(), byName: new Map(), entries: [] }) => {
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
        const normalizedName = normalizeMedicineName(candidateName);
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
        const match = numericEntries.find(({ key }) => keywords.every((keyword) => key.includes(keyword)));
        if (match && match.value > 0) {
            return match.value;
        }
    }

    return 0;
};

const inferItemUsdAmount = (item = {}, medicine) => {
    const quantity = getItemQuantity(item);

    const directUsdTotal = toNumber(
        item.totalPriceUSD,
        item.totalAmountUSD,
        item.lineTotalUSD,
        item.subtotalUSD
    );

    if (directUsdTotal > 0) {
        return directUsdTotal;
    }

    const directUsdUnitPrice = toNumber(
        item.unitPriceUSD,
        item.priceUSD,
        item.sellingPricePerUnitUSD
    );

    if (directUsdUnitPrice > 0) {
        return directUsdUnitPrice * quantity;
    }

    const directUsdBoxPrice = toNumber(
        item.boxPriceUSD,
        item.sellingPricePerBoxUSD
    );

    const lineTotalSOS = toNumber(
        item.totalPrice,
        item.totalAmount,
        item.lineTotal,
        item.subtotal
    );

    const unitPriceSOS = toNumber(
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

    const medicineBoxUsd = toNumber(
        medicine.sellingPricePerBoxUSD,
        medicine.salePricePerBoxUSD,
        findMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
    );
    const medicineUnitUsd = toNumber(
        medicine.sellingPricePerUnitUSD,
        medicine.salePricePerUnitUSD,
        findMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
    );
    const medicineBoxSos = toNumber(
        medicine.sellingPricePerBoxSOS,
        medicine.salePricePerBoxSOS,
        findMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
    );
    const medicineUnitSos = toNumber(
        medicine.sellingPricePerUnitSOS,
        medicine.salePricePerUnitSOS,
        findMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
    );
    const mode = String(item.saleUnit || item.unitType || item.quantityType || '').toUpperCase();

    if ((mode === 'BOX' || mode === 'BOXES') && medicineBoxUsd > 0) {
        return medicineBoxUsd * quantity;
    }

    if ((mode === 'UNIT' || mode === 'PILL' || mode === 'PIECE') && medicineUnitUsd > 0) {
        return medicineUnitUsd * quantity;
    }

    if (lineTotalSOS > 0 && medicineBoxSos > 0 && medicineBoxUsd > 0 && almostEqual(lineTotalSOS, medicineBoxSos * quantity)) {
        return medicineBoxUsd * quantity;
    }

    if (lineTotalSOS > 0 && medicineUnitSos > 0 && medicineUnitUsd > 0 && almostEqual(lineTotalSOS, medicineUnitSos * quantity)) {
        return medicineUnitUsd * quantity;
    }

    if (unitPriceSOS > 0 && medicineBoxSos > 0 && medicineBoxUsd > 0 && almostEqual(unitPriceSOS, medicineBoxSos)) {
        return medicineBoxUsd * quantity;
    }

    if (unitPriceSOS > 0 && medicineUnitSos > 0 && medicineUnitUsd > 0 && almostEqual(unitPriceSOS, medicineUnitSos)) {
        return medicineUnitUsd * quantity;
    }

    return 0;
};

const inferUsdFromSaleTotal = (sale = {}, item = {}, medicine) => {
    if (!medicine) {
        return 0;
    }

    const quantity = getItemQuantity(item);
    const saleTotalSOS = toNumber(sale.totalAmount);

    if (saleTotalSOS <= 0) {
        return 0;
    }

    const medicineBoxUsd = toNumber(
        medicine.sellingPricePerBoxUSD,
        medicine.salePricePerBoxUSD,
        findMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
    );
    const medicineUnitUsd = toNumber(
        medicine.sellingPricePerUnitUSD,
        medicine.salePricePerUnitUSD,
        findMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
    );
    const medicineBoxSos = toNumber(
        medicine.sellingPricePerBoxSOS,
        medicine.salePricePerBoxSOS,
        findMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
    );
    const medicineUnitSos = toNumber(
        medicine.sellingPricePerUnitSOS,
        medicine.salePricePerUnitSOS,
        findMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
    );

    if (medicineBoxSos > 0 && medicineBoxUsd > 0 && almostEqual(saleTotalSOS, medicineBoxSos * quantity)) {
        return medicineBoxUsd * quantity;
    }

    if (medicineUnitSos > 0 && medicineUnitUsd > 0 && almostEqual(saleTotalSOS, medicineUnitSos * quantity)) {
        return medicineUnitUsd * quantity;
    }

    return 0;
};

const getSaleUsdAmount = (sale = {}, medicineLookup) => {
    const saleCurrency = getSaleCurrency(sale);
    const totalAmount = toNumber(sale.totalAmount);

    if (saleCurrency === 'USD' && totalAmount > 0) {
        return totalAmount;
    }

    if (!Array.isArray(sale.items) || sale.items.length === 0) {
        return 0;
    }

    if (sale.items.length === 1) {
        const item = sale.items[0];
        const medicine = getMedicineForItem(item, medicineLookup);
        const directItemUsd = inferItemUsdAmount(item, medicine);

        if (directItemUsd > 0) {
            return directItemUsd;
        }

        const saleMatchedUsd = inferUsdFromSaleTotal(sale, item, medicine);
        if (saleMatchedUsd > 0) {
            return saleMatchedUsd;
        }
    }

    return sale.items.reduce((acc, item) => {
        const medicine = getMedicineForItem(item, medicineLookup);
        return acc + inferItemUsdAmount(item, medicine);
    }, 0);
};

const getSalePricingSnapshot = (sale = {}, medicineLookup) => {
    if (!Array.isArray(sale.items) || sale.items.length !== 1) {
        return null;
    }

    const item = sale.items[0];
    const medicine = getMedicineForItem(item, medicineLookup);

    if (!medicine) {
        return null;
    }

    return {
        medicineName: medicine.name || medicine.medicineName || medicine.productName || '',
        quantity: getItemQuantity(item),
        sellingPricePerBoxUSD: toNumber(
            medicine.sellingPricePerBoxUSD,
            medicine.salePricePerBoxUSD,
            findMedicinePrice(medicine, [['selling', 'box', 'usd'], ['box', 'usd']])
        ),
        sellingPricePerUnitUSD: toNumber(
            medicine.sellingPricePerUnitUSD,
            medicine.salePricePerUnitUSD,
            findMedicinePrice(medicine, [['selling', 'unit', 'usd'], ['unit', 'usd']])
        ),
        sellingPricePerBoxSOS: toNumber(
            medicine.sellingPricePerBoxSOS,
            medicine.salePricePerBoxSOS,
            findMedicinePrice(medicine, [['selling', 'box', 'sos'], ['box', 'sos']])
        ),
        sellingPricePerUnitSOS: toNumber(
            medicine.sellingPricePerUnitSOS,
            medicine.salePricePerUnitSOS,
            findMedicinePrice(medicine, [['selling', 'unit', 'sos'], ['unit', 'sos']])
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
            currency: normalizeCurrency(entry.currency || debt.currency || debt.currencyCode || debt.saleCurrency, 'SOS')
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
            currency: getDebtCurrency(debt)
        }];
    }

    return [];
});

const sumPaymentsInRange = (debts = [], start, end) => getDebtPaymentEvents(debts)
    .filter((entry) => {
        const paidAt = new Date(entry.paidAt);
        return paidAt >= start && paidAt < end;
    });

const getFinanceTimelineBuckets = (period, range) => {
    if (period === 'daily') {
        return Array.from({ length: 24 }, (_, hour) => ({
            key: String(hour),
            label: `${String(hour).padStart(2, '0')}:00`,
            start: new Date(range.currentStart.getFullYear(), range.currentStart.getMonth(), range.currentStart.getDate(), hour, 0, 0, 0),
            end: new Date(range.currentStart.getFullYear(), range.currentStart.getMonth(), range.currentStart.getDate(), hour + 1, 0, 0, 0),
            revenue: 0,
            cost: 0,
            profit: 0,
            invoices: 0
        }));
    }

    if (period === 'weekly') {
        return Array.from({ length: 7 }, (_, offset) => {
            const start = new Date(range.currentStart);
            start.setDate(start.getDate() + offset);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            return {
                key: start.toISOString(),
                label: start.toLocaleDateString('en-US', { weekday: 'short' }),
                start,
                end,
                revenue: 0,
                cost: 0,
                profit: 0,
                invoices: 0
            };
        });
    }

    if (period === 'monthly') {
        const bucketCount = Math.max(1, Math.round((range.currentEnd.getTime() - range.currentStart.getTime()) / 86400000));

        return Array.from({ length: bucketCount }, (_, offset) => {
            const start = new Date(range.currentStart);
            start.setDate(start.getDate() + offset);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            return {
                key: start.toISOString(),
                label: start.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
                start,
                end,
                revenue: 0,
                cost: 0,
                profit: 0,
                invoices: 0
            };
        });
    }

    return Array.from({ length: 12 }, (_, monthIndex) => {
        const start = new Date(range.currentStart.getFullYear(), monthIndex, 1);
        const end = new Date(range.currentStart.getFullYear(), monthIndex + 1, 1);

        return {
            key: `${range.currentStart.getFullYear()}-${monthIndex + 1}`,
            label: start.toLocaleDateString('en-US', { month: 'short' }),
            start,
            end,
            revenue: 0,
            cost: 0,
            profit: 0,
            invoices: 0
        };
    });
};

const buildFinanceTimeline = (sales = [], period, range) => {
    const buckets = getFinanceTimelineBuckets(period, range);

    sales.forEach((sale) => {
        const createdAt = new Date(sale.createdAt || sale.date || Date.now());
        const bucket = buckets.find((entry) => createdAt >= entry.start && createdAt < entry.end);

        if (!bucket) {
            return;
        }

        bucket.revenue += Number(sale.totalAmount) || 0;
        bucket.cost += Number(sale.totalCost) || 0;
        bucket.profit += Number(sale.profit) || 0;
        bucket.invoices += 1;
    });

    return buckets.map(({ start, end, ...bucket }) => bucket);
};

const getFinanceTimelineMode = (filterMode, period, range) => {
    if (filterMode !== 'custom') {
        return period;
    }

    const durationDays = Math.max(1, Math.round((range.currentEnd.getTime() - range.currentStart.getTime()) / 86400000));

    if (durationDays <= 2) {
        return 'daily';
    }

    if (durationDays <= 45) {
        return 'monthly';
    }

    return 'yearly';
};

const getMedicineFinanceSummary = (sales = [], medicines = []) => {
    const medicineById = new Map();
    const medicineByName = new Map();
    const summaryMap = new Map();
    let usedEstimatedCurrentCost = false;

    medicines.forEach((medicine) => {
        const idKey = medicine?._id ? String(medicine._id) : '';
        const nameKey = String(medicine?.name || '').trim().toLowerCase();

        if (idKey) {
            medicineById.set(idKey, medicine);
        }

        if (nameKey) {
            medicineByName.set(nameKey, medicine);
        }
    });

    sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
            const medicineId = item.medicineId ? String(item.medicineId) : '';
            const itemName = String(item.name || '').trim();
            const medicine =
                (medicineId && medicineById.get(medicineId)) ||
                medicineByName.get(itemName.toLowerCase()) ||
                null;
            const itemKey = medicineId || itemName.toLowerCase();

            if (!itemKey) {
                return;
            }

            const unitsPerBox = Number(item.unitsPerBoxSnapshot || medicine?.unitsPerBox) || 1;
            const quantity = Number(item.quantity) || 0;
            const totalUnitsSold = Number(item.totalUnitsSold) || (
                String(item.sellType || '').toUpperCase() === 'BOX'
                    ? quantity * unitsPerBox
                    : quantity
            );
            const totalRevenue = Number(item.total) || 0;
            const purchasePricePerUnitSnapshot = Number(item.purchasePricePerUnitSnapshot) || 0;
            let totalCost = Number(item.lineCost) || 0;

            if (totalCost <= 0 && purchasePricePerUnitSnapshot > 0 && totalUnitsSold > 0) {
                totalCost = purchasePricePerUnitSnapshot * totalUnitsSold;
            }

            if (totalCost <= 0 && medicine?.purchasePricePerBox && medicine?.unitsPerBox) {
                totalCost = (Number(medicine.purchasePricePerBox) / Number(medicine.unitsPerBox)) * totalUnitsSold;
                usedEstimatedCurrentCost = true;
            }

            const netIncome = totalRevenue - totalCost;

            if (!summaryMap.has(itemKey)) {
                summaryMap.set(itemKey, {
                    medicineId: medicineId || null,
                    name: medicine?.name || itemName || 'Unnamed medicine',
                    category: medicine?.category || '',
                    supplierName: medicine?.supplier?.name || '',
                    invoiceNumbers: new Set(),
                    boxesSold: 0,
                    looseUnitsSold: 0,
                    totalUnitsSold: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    netIncome: 0,
                    currentBoxesInStock: Number(medicine?.boxesInStock) || 0,
                    currentUnitsInStock: Number(medicine?.totalUnitsInStock) || 0,
                    currentPurchasePricePerBox: Number(medicine?.purchasePricePerBox) || 0,
                    currentSellingPricePerUnit: Number(medicine?.sellingPricePerUnit) || 0,
                    averageSellingPricePerUnit: 0,
                    averageCostPerUnit: 0,
                    lastSoldAt: sale.createdAt || sale.date || null
                });
            }

            const entry = summaryMap.get(itemKey);
            entry.invoiceNumbers.add(sale.invoiceNumber);
            entry.totalUnitsSold += totalUnitsSold;
            entry.totalRevenue += totalRevenue;
            entry.totalCost += totalCost;
            entry.netIncome += netIncome;

            if (String(item.sellType || '').toUpperCase() === 'BOX') {
                entry.boxesSold += quantity;
            } else {
                entry.looseUnitsSold += quantity;
            }

            const soldAt = new Date(sale.createdAt || sale.date || Date.now());
            if (!entry.lastSoldAt || soldAt > new Date(entry.lastSoldAt)) {
                entry.lastSoldAt = soldAt;
            }
        });
    });

    const medicineSummaries = Array.from(summaryMap.values())
        .map((entry) => {
            const invoiceCount = entry.invoiceNumbers.size;
            const totalUnitsSold = Number(entry.totalUnitsSold) || 0;

            return {
                ...entry,
                invoiceCount,
                averageSellingPricePerUnit: totalUnitsSold > 0 ? entry.totalRevenue / totalUnitsSold : 0,
                averageCostPerUnit: totalUnitsSold > 0 ? entry.totalCost / totalUnitsSold : 0
            };
        })
        .sort((left, right) => right.netIncome - left.netIncome);

    return {
        usedEstimatedCurrentCost,
        medicineSummaries,
        medicineProfitChart: medicineSummaries.slice(0, 10).map((entry) => ({
            name: entry.name,
            revenue: entry.totalRevenue,
            cost: entry.totalCost,
            profit: entry.netIncome
        }))
    };
};

const getMedicineInventorySummary = (medicines = [], sales = []) => {
    const medicineById = new Map();
    const medicineByName = new Map();
    const soldMap = new Map();
    let usedEstimatedCurrentCost = false;

    medicines.forEach((medicine) => {
        const idKey = medicine?._id ? String(medicine._id) : '';
        const nameKey = String(medicine?.name || '').trim().toLowerCase();

        if (idKey) {
            medicineById.set(idKey, medicine);
        }

        if (nameKey) {
            medicineByName.set(nameKey, medicine);
        }
    });

    sales.forEach((sale) => {
        (sale.items || []).forEach((item) => {
            const medicineId = item.medicineId ? String(item.medicineId) : '';
            const itemName = String(item.name || '').trim();
            const medicine =
                (medicineId && medicineById.get(medicineId)) ||
                medicineByName.get(itemName.toLowerCase()) ||
                null;
            const itemKey = medicineId || itemName.toLowerCase();

            if (!itemKey) {
                return;
            }

            const unitsPerBox = Number(item.unitsPerBoxSnapshot || medicine?.unitsPerBox) || 1;
            const quantity = Number(item.quantity) || 0;
            const totalUnitsSold = Number(item.totalUnitsSold) || (
                String(item.sellType || '').toUpperCase() === 'BOX'
                    ? quantity * unitsPerBox
                    : quantity
            );
            const purchasePricePerUnitSnapshot = Number(item.purchasePricePerUnitSnapshot) || 0;
            let totalCost = Number(item.lineCost) || 0;

            if (totalCost <= 0 && purchasePricePerUnitSnapshot > 0 && totalUnitsSold > 0) {
                totalCost = purchasePricePerUnitSnapshot * totalUnitsSold;
            }

            if (totalCost <= 0 && medicine?.purchasePricePerBox && medicine?.unitsPerBox) {
                totalCost = (Number(medicine.purchasePricePerBox) / Number(medicine.unitsPerBox)) * totalUnitsSold;
                usedEstimatedCurrentCost = true;
            }

            if (!soldMap.has(itemKey)) {
                soldMap.set(itemKey, {
                    soldUnits: 0,
                    soldCost: 0
                });
            }

            const entry = soldMap.get(itemKey);
            entry.soldUnits += totalUnitsSold;
            entry.soldCost += totalCost;
        });
    });

    const inventorySummaries = medicines
        .map((medicine) => {
            const idKey = medicine?._id ? String(medicine._id) : '';
            const nameKey = String(medicine?.name || '').trim().toLowerCase();
            const soldEntry =
                (idKey && soldMap.get(idKey)) ||
                soldMap.get(nameKey) || {
                    soldUnits: 0,
                    soldCost: 0
                };

            const purchasePricePerBox = Number(medicine.purchasePricePerBox) || 0;
            const unitsPerBox = Number(medicine.unitsPerBox) || 0;
            const purchasePricePerUnit = unitsPerBox > 0 ? purchasePricePerBox / unitsPerBox : 0;
            const boxesInStock = Number(medicine.boxesInStock) || 0;
            const unitsInStock = Number(medicine.totalUnitsInStock) || 0;
            const stockCostValue = unitsInStock * purchasePricePerUnit;
            const estimatedPurchasedUnits = unitsInStock + (Number(soldEntry.soldUnits) || 0);
            const estimatedPurchasedBoxes = unitsPerBox > 0 ? estimatedPurchasedUnits / unitsPerBox : 0;
            const estimatedPurchasedValue = stockCostValue + (Number(soldEntry.soldCost) || 0);

            return {
                _id: medicine._id,
                name: medicine.name,
                category: medicine.category || '',
                supplierName: medicine.supplier?.name || '',
                purchasePricePerBox,
                purchasePricePerUnit,
                unitsPerBox,
                boxesInStock,
                unitsInStock,
                stockCostValue,
                soldUnitsAllTime: Number(soldEntry.soldUnits) || 0,
                soldCostAllTime: Number(soldEntry.soldCost) || 0,
                estimatedPurchasedUnits,
                estimatedPurchasedBoxes,
                estimatedPurchasedValue
            };
        })
        .sort((left, right) => right.estimatedPurchasedValue - left.estimatedPurchasedValue);

    const chartItems = inventorySummaries.slice(0, 10);

    return {
        usedEstimatedCurrentCost,
        inventorySummaries,
        inventoryQuantityChart: chartItems.map((item) => ({
            name: item.name,
            purchasedUnits: item.estimatedPurchasedUnits,
            inStockUnits: item.unitsInStock
        })),
        inventoryMoneyChart: chartItems.map((item) => ({
            name: item.name,
            purchasedValue: item.estimatedPurchasedValue,
            stockValue: item.stockCostValue
        }))
    };
};

// @desc    Get Admin Dashboard Stats (Monitor Everything)
router.get('/dashboard', protect, authorize('Admin'), async (req, res) => {
    try {
        // Staff Statistics (all non-admin roles)
        const allStaff = await User.find({ role: { $in: STAFF_ROLES } }).select('role status');
        const byRole = {
            cashier: { total: 0, active: 0, suspended: 0 },
            doctor: { total: 0, active: 0, suspended: 0 },
            labTechnician: { total: 0, active: 0, suspended: 0 }
        };

        allStaff.forEach((member) => {
            const isActive = member.status === 'Active';
            if (member.role === 'Cashier') {
                byRole.cashier.total += 1;
                byRole.cashier.active += isActive ? 1 : 0;
                byRole.cashier.suspended += isActive ? 0 : 1;
            } else if (member.role === 'Doctor') {
                byRole.doctor.total += 1;
                byRole.doctor.active += isActive ? 1 : 0;
                byRole.doctor.suspended += isActive ? 0 : 1;
            } else if (member.role === 'Lab Technician') {
                byRole.labTechnician.total += 1;
                byRole.labTechnician.active += isActive ? 1 : 0;
                byRole.labTechnician.suspended += isActive ? 0 : 1;
            }
        });

        const totalStaff = allStaff.length;
        const activeStaff = allStaff.filter((member) => member.status === 'Active').length;
        const suspendedStaff = totalStaff - activeStaff;

        // Customer & Supplier Stats
        const totalCustomers = await Customer.countDocuments();
        const totalSuppliers = await Supplier.countDocuments();
        const totalPatients = await Patient.countDocuments();

        // Inventory Stats
        const allMedicines = await Medicine.find();
        const medicineLookup = getMedicineLookup(allMedicines);
        const totalMedicines = allMedicines.length;
        const outOfStock = allMedicines.filter(m => m.totalUnitsInStock < 5).length;
        const inventoryNow = new Date();
        const expiredMedicines = allMedicines.filter(m => new Date(m.expiryDate) < inventoryNow).length;

        // Calculate total stock value
        let totalStockValue = 0;
        allMedicines.forEach(med => {
            const purchasePricePerUnit = med.purchasePricePerBox / med.unitsPerBox;
            totalStockValue += med.totalUnitsInStock * purchasePricePerUnit;
        });
        const totalFullBoxes = allMedicines.reduce((acc, med) => acc + (med.boxesInStock || 0), 0);
        const totalLoosePills = allMedicines.reduce((acc, med) => acc + ((med.totalUnitsInStock || 0) % (med.unitsPerBox || 1)), 0);

        // Financial Stats (All Sales)
        const allSales = await Sale.find();
        const totalRevenue = allSales.reduce((acc, s) => acc + s.totalAmount, 0);
        const totalProfit = allSales.reduce((acc, s) => acc + s.profit, 0);
        const totalCost = allSales.reduce((acc, s) => acc + s.totalCost, 0);
        const cashSalesCount = allSales.filter((sale) => sale.paymentType === 'CASH').length;
        const creditSalesCount = allSales.filter((sale) => sale.paymentType === 'CREDIT').length;

        // Debts
        const debts = await Debt.find({ status: { $ne: 'PAID' } });
        const totalDebts = debts.reduce((acc, d) => acc + d.remainingBalance, 0);

        // Monthly Sales Data (Last 12 months)
        const monthlyData = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthSales = await Sale.find({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });

            const monthRevenue = monthSales.reduce((acc, s) => acc + s.totalAmount, 0);
            const monthProfit = monthSales.reduce((acc, s) => acc + s.profit, 0);

            monthlyData.push({
                month: startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue,
                profit: monthProfit,
                sales: monthSales.length
            });
        }

        // System process stats
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const labRequests = await LabRequest.find().sort({ createdAt: -1 });
        const totalLabRequests = labRequests.length;
        const totalLabPaid = labRequests.filter((req) => req.isPaid).length;
        const totalLabAwaitingDoctor = labRequests.filter((req) => req.status === 'Awaiting Doctor').length;
        const totalLabCompleted = labRequests.filter((req) => req.status === 'Completed').length;

        const prescriptions = await Prescription.find().sort({ createdAt: -1 });
        const totalPrescriptions = prescriptions.length;
        const issuedPrescriptions = prescriptions.filter((p) => p.status === 'Issued').length;
        const dispensedPrescriptions = prescriptions.filter((p) => p.status === 'Dispensed').length;
        const todayPrescriptions = prescriptions.filter((p) => p.createdAt >= startOfToday).length;

        const patientsToday = await Patient.countDocuments({ createdAt: { $gte: startOfToday } });
        const waitingForDoctor = await Patient.countDocuments({ visitStatus: 'Waiting for Doctor' });
        const inConsultation = await Patient.countDocuments({ visitStatus: 'In Consultation' });
        const outpatients = await Patient.countDocuments({ visitStatus: 'Outpatient' });

        // Recent Activities
        const recentSales = await Sale.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('cashierId', 'name email');

        const recentLabRequests = await LabRequest.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('doctorId', 'name')
            .populate('resultEnteredBy', 'name')
            .populate('dispensedBy', 'name');

        const recentPrescriptions = await Prescription.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('doctorId', 'name')
            .populate('patientId', 'name patientId');

        const recentPatients = await Patient.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .select('name patientId visitStatus createdAt');

        const recentDebts = await Debt.find()
            .sort({ updatedAt: -1 })
            .limit(10);

        const activityFeed = [
            ...recentSales.map((sale) => ({
                type: 'SALE',
                title: `Sale ${sale.invoiceNumber}`,
                description: `${sale.customerName} • ${sale.totalAmount} SOS • ${sale.paymentType}`,
                actor: sale.cashierId?.name || 'Unknown',
                createdAt: sale.createdAt
            })),
            ...recentLabRequests.map((request) => ({
                type: 'LAB',
                title: `Lab ${request.ticketNumber}`,
                description: `${request.patientName} • ${request.status}`,
                actor: request.resultEnteredBy?.name || request.doctorName || request.doctorId?.name || 'Unknown',
                createdAt: request.updatedAt || request.createdAt
            })),
            ...recentPrescriptions.map((prescription) => ({
                type: 'PRESCRIPTION',
                title: `Prescription ${prescription.status}`,
                description: `${prescription.patientId?.name || 'Unknown patient'} • ${prescription.medicines?.length || 0} medicines`,
                actor: prescription.doctorId?.name || 'Unknown',
                createdAt: prescription.createdAt
            })),
            ...recentPatients.map((patient) => ({
                type: 'PATIENT',
                title: `Patient ${patient.patientId}`,
                description: `${patient.name} • ${patient.visitStatus}`,
                actor: 'Registration',
                createdAt: patient.createdAt
            }))
        ]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 25);

        res.json({
            staff: {
                total: totalStaff,
                active: activeStaff,
                suspended: suspendedStaff,
                // Backward compatibility for existing frontend keys
                totalCashiers: byRole.cashier.total,
                activeCashiers: byRole.cashier.active,
                suspendedCashiers: byRole.cashier.suspended,
                byRole
            },
            inventory: {
                totalMedicines,
                outOfStock,
                expiredMedicines,
                totalStockValue,
                totalFullBoxes,
                totalLoosePills
            },
            customers: {
                total: totalCustomers
            },
            suppliers: {
                total: totalSuppliers
            },
            patients: {
                total: totalPatients,
                today: patientsToday,
                waitingForDoctor,
                inConsultation,
                outpatient: outpatients
            },
            lab: {
                totalRequests: totalLabRequests,
                paid: totalLabPaid,
                awaitingDoctor: totalLabAwaitingDoctor,
                completed: totalLabCompleted
            },
            prescriptions: {
                total: totalPrescriptions,
                issued: issuedPrescriptions,
                dispensed: dispensedPrescriptions,
                today: todayPrescriptions
            },
            financial: {
                totalRevenue,
                totalProfit,
                totalCost,
                totalDebts,
                totalSales: allSales.length,
                cashSalesCount,
                creditSalesCount
            },
            monthlyData,
            recentSales,
            recentLabRequests,
            recentPrescriptions,
            recentPatients,
            recentDebts,
            activityFeed
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Staff (Cashiers, Doctors, Lab Techs)
router.get('/staff', protect, authorize('Admin'), async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: 'Admin' } })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create New Staff Member
router.post('/staff', protect, authorize('Admin'), async (req, res) => {
    try {
        const name = cleanString(req.body?.name, { maxLength: 80 });
        const email = normalizeEmail(req.body?.email);
        const role = cleanString(req.body?.role, { maxLength: 40 });
        const providedPassword = cleanString(req.body?.password, {
            trim: false,
            maxLength: 128,
            allowEmpty: true
        });

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'A valid email is required' });
        }

        if (!STAFF_ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid staff role' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const password = providedPassword
            ? assertStrongPassword(providedPassword, 'Staff password')
            : generateTemporaryPassword();
        const user = await User.create({
            name,
            email,
            password,
            role,
            status: 'Active',
            mustChangePassword: true
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        if (!providedPassword) {
            userResponse.temporaryPassword = password;
        }

        res.status(201).json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update Staff Member
router.patch('/staff/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const name = cleanString(req.body?.name, { maxLength: 80, allowEmpty: true });
        const email = normalizeEmail(req.body?.email);
        const status = cleanString(req.body?.status, { maxLength: 20, allowEmpty: true });
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (email && email !== user.email) {
            if (!isValidEmail(email)) {
                return res.status(400).json({ message: 'A valid email is required' });
            }

            const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists' });
            }

            user.email = email;
        }
        if (status) user.status = status;

        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Reset Staff Password
router.patch('/staff/:id/reset-password', protect, authorize('Admin'), async (req, res) => {
    try {
        const newPassword = cleanString(req.body?.newPassword, {
            trim: false,
            maxLength: 128,
            allowEmpty: true
        });
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot reset admin password from this action' });
        }

        const nextPassword = newPassword
            ? assertStrongPassword(newPassword, 'New password')
            : generateTemporaryPassword();

        user.password = nextPassword;
        user.mustChangePassword = true;
        await user.save();

        res.json({
            message: 'Password reset successfully',
            temporaryPassword: newPassword ? null : nextPassword,
            mustChangePassword: true
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Suspend/Activate Staff
router.patch('/staff/:id/toggle-status', protect, authorize('Admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot suspend or activate admin users' });
        }

        user.status = user.status === 'Active' ? 'Inactive' : 'Active';
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Delete Staff Member
router.delete('/staff/:id', protect, authorize('Admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'Admin') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        await user.deleteOne();
        res.json({ message: 'Staff member deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get All Inventory (Monitor Stock)
router.get('/inventory', protect, authorize('Admin'), async (req, res) => {
    try {
        const medicines = await Medicine.find()
            .populate('supplier', 'name source')
            .sort({ createdAt: -1 });
        res.json(medicines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Customers
router.get('/customers', protect, authorize('Admin'), async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Sales (Monitor All Transactions)
router.get('/sales', protect, authorize('Admin'), async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('cashierId', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Debts
router.get('/debts', protect, authorize('Admin'), async (req, res) => {
    try {
        const debts = await Debt.find().sort({ createdAt: -1 });
        res.json(debts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Admin Reports (System-wide)
router.get('/reports', protect, authorize('Admin'), async (req, res) => {
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

        const salesFilter = {
            createdAt: { $gte: ranges.currentStart, $lt: ranges.currentEnd }
        };
        const previousSalesFilter = {
            createdAt: { $gte: ranges.previousStart, $lt: ranges.previousEnd }
        };

        const sales = await Sale.find(salesFilter);
        const previousSales = await Sale.find(previousSalesFilter);
        const debts = await Debt.find();
        const currentSummary = summarizeSales(sales);
        const previousSummary = summarizeSales(previousSales);
        const currentDebtPayments = sumPaymentsInRange(debts, ranges.currentStart, ranges.currentEnd);
        const previousDebtPayments = sumPaymentsInRange(debts, ranges.previousStart, ranges.previousEnd);
        const currencyTotals = summarizeCurrencyTotals(sales, debts, currentDebtPayments);
        const previousCurrencyTotals = summarizeCurrencyTotals(previousSales, debts, previousDebtPayments);
        const debtCollectionsAmount = currentDebtPayments.reduce((acc, entry) => acc + entry.amount, 0);
        const previousDebtCollectionsAmount = previousDebtPayments.reduce((acc, entry) => acc + entry.amount, 0);
        const actualMoneyReceived = currentSummary.cashRevenue + debtCollectionsAmount;
        const previousActualMoneyReceived = previousSummary.cashRevenue + previousDebtCollectionsAmount;

        const allMedicines = await Medicine.find();
        const medicineLookup = getMedicineLookup(allMedicines);
        let investedStockValue = 0;
        let totalFullBoxes = 0;
        let totalLoosePills = 0;

        allMedicines.forEach((medicine) => {
            const purchasePricePerUnit = medicine.purchasePricePerBox / medicine.unitsPerBox;
            investedStockValue += medicine.totalUnitsInStock * purchasePricePerUnit;
            totalFullBoxes += medicine.boxesInStock || 0;
            totalLoosePills += (medicine.totalUnitsInStock || 0) % medicine.unitsPerBox;
        });

        const recentTransactions = await Sale.find(salesFilter)
            .populate('cashierId', 'name email')
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
                createdAt: sale.createdAt,
                cashierName: sale.cashierId?.name || 'Unknown'
            }));

        const customerPurchases = sales
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((sale) => ({
                invoiceNumber: sale.invoiceNumber,
                customerName: sale.customerName,
                currency: getSaleCurrency(sale),
                paymentType: sale.paymentType,
                totalAmount: sale.totalAmount,
                usdTotalAmount: getSaleUsdAmount(sale, medicineLookup),
                pricingSnapshot: getSalePricingSnapshot(sale, medicineLookup),
                items: sale.items,
                createdAt: sale.createdAt
            }));

        const customerCollections = currentDebtPayments
            .slice()
            .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt))
            .map((entry) => ({
                customerName: entry.customerName,
                invoiceNumber: entry.invoiceNumber,
                currency: normalizeCurrency(entry.currency, 'SOS'),
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
            exchangeRate: SOS_PER_USD,
            totalRevenue: currentSummary.totalRevenue,
            totalProfit: currentSummary.totalProfit,
            totalCost: currentSummary.totalCost,
            totalDebts: debts
                .filter((debt) => debt.status !== 'PAID')
                .reduce((acc, debt) => acc + debt.remainingBalance, 0),
            cashRevenue: currentSummary.cashRevenue,
            creditRevenue: currentSummary.creditRevenue,
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
            investedStockValue,
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

// @desc    Get Admin Finance Report (System-wide)
router.get('/finance', protect, authorize('Admin'), async (req, res) => {
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

        const [sales, previousSales, debts, medicines, inventorySales] = await Promise.all([
            Sale.find({
                createdAt: { $gte: ranges.currentStart, $lt: ranges.currentEnd }
            })
                .populate('cashierId', 'name email')
                .sort({ createdAt: -1 }),
            Sale.find({
                createdAt: { $gte: ranges.previousStart, $lt: ranges.previousEnd }
            }),
            Debt.find({ status: { $ne: 'PAID' } }),
            Medicine.find().populate('supplier', 'name').sort({ createdAt: -1 }),
            Sale.find({}).select('items')
        ]);

        const currentSummary = summarizeSales(sales);
        const previousSummary = summarizeSales(previousSales);
        const timelineMode = getFinanceTimelineMode(filterMode, period, ranges);
        const timeline = buildFinanceTimeline(sales, timelineMode, ranges);
        const medicineFinance = getMedicineFinanceSummary(sales, medicines);
        const inventorySummary = getMedicineInventorySummary(medicines, inventorySales);
        const inventorySummaryById = new Map(
            inventorySummary.inventorySummaries.map((item) => [String(item._id), item])
        );

        let stockPurchaseValue = 0;
        let stockExpectedSalesValue = 0;
        let stockExpectedProfit = 0;
        let totalBoxesInStock = 0;
        let totalUnitsInStock = 0;

        const inventoryLedger = medicines.map((medicine) => {
            const inventoryEntry = inventorySummaryById.get(String(medicine._id)) || {};
            const purchasePricePerBox = Number(medicine.purchasePricePerBox) || 0;
            const unitsPerBox = Number(medicine.unitsPerBox) || 0;
            const purchasePricePerUnit = unitsPerBox > 0 ? purchasePricePerBox / unitsPerBox : 0;
            const sellingPricePerUnit = Number(medicine.sellingPricePerUnit) || 0;
            const boxesInStock = Number(medicine.boxesInStock) || 0;
            const unitsInStock = Number(medicine.totalUnitsInStock) || 0;
            const stockCostValue = unitsInStock * purchasePricePerUnit;
            const stockSaleValue = unitsInStock * sellingPricePerUnit;
            const stockProfitValue = stockSaleValue - stockCostValue;

            stockPurchaseValue += stockCostValue;
            stockExpectedSalesValue += stockSaleValue;
            stockExpectedProfit += stockProfitValue;
            totalBoxesInStock += boxesInStock;
            totalUnitsInStock += unitsInStock;

            return {
                _id: medicine._id,
                name: medicine.name,
                category: medicine.category || '',
                supplierName: medicine.supplier?.name || '',
                purchasePricePerBox,
                purchasePricePerUnit,
                sellingPricePerUnit,
                unitsPerBox,
                estimatedPurchasedUnits: Number(inventoryEntry.estimatedPurchasedUnits) || unitsInStock,
                estimatedPurchasedBoxes: Number(inventoryEntry.estimatedPurchasedBoxes) || boxesInStock,
                estimatedPurchasedValue: Number(inventoryEntry.estimatedPurchasedValue) || stockCostValue,
                boxesInStock,
                unitsInStock,
                stockCostValue,
                stockSaleValue,
                stockProfitValue,
                expiryDate: medicine.expiryDate,
                createdAt: medicine.createdAt
            };
        });

        const inventoryValueChart = inventoryLedger
            .slice()
            .sort((left, right) => right.stockCostValue - left.stockCostValue)
            .slice(0, 8)
            .map((item) => ({
                name: item.name,
                purchaseValue: item.stockCostValue,
                salesValue: item.stockSaleValue,
                profitValue: item.stockProfitValue
            }));

        const salesLedger = sales.map((sale) => ({
            _id: sale._id,
            invoiceNumber: sale.invoiceNumber,
            customerName: sale.customerName,
            cashierName: sale.cashierId?.name || 'Unknown',
            paymentType: sale.paymentType,
            status: sale.status,
            totalAmount: Number(sale.totalAmount) || 0,
            totalCost: Number(sale.totalCost) || 0,
            profit: Number(sale.profit) || 0,
            itemCount: Array.isArray(sale.items) ? sale.items.length : 0,
            createdAt: sale.createdAt
        }));

        const outstandingDebt = debts.reduce((sum, debt) => sum + (Number(debt.remainingBalance) || 0), 0);

        res.json({
            period,
            filterMode,
            timelineMode,
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
            summary: {
                totalRevenue: currentSummary.totalRevenue,
                totalCost: currentSummary.totalCost,
                netIncome: currentSummary.totalProfit,
                cashRevenue: currentSummary.cashRevenue,
                creditRevenue: currentSummary.creditRevenue,
                invoiceCount: currentSummary.orderCount,
                outstandingDebt,
                stockPurchaseValue,
                stockExpectedSalesValue,
                stockExpectedProfit,
                totalBoxesInStock,
                totalUnitsInStock,
                medicineCount: inventoryLedger.length
            },
            previous: {
                totalRevenue: previousSummary.totalRevenue,
                totalCost: previousSummary.totalCost,
                netIncome: previousSummary.totalProfit,
                invoiceCount: previousSummary.orderCount
            },
            timeline,
            salesLedger,
            medicineSummaries: medicineFinance.medicineSummaries,
            medicineProfitChart: medicineFinance.medicineProfitChart,
            inventoryLedger,
            inventoryValueChart,
            inventoryQuantityChart: inventorySummary.inventoryQuantityChart,
            inventoryMoneyChart: inventorySummary.inventoryMoneyChart,
            accountingNotes: {
                medicineCostBasis: medicineFinance.usedEstimatedCurrentCost
                    ? 'Some older medicine sales use the current saved purchase price as a fallback because older sale records did not store medicine-level cost snapshots.'
                    : 'Medicine profit uses the saved sale cost snapshots from your recorded sales data.',
                inventoryPurchaseBasis: inventorySummary.usedEstimatedCurrentCost
                    ? 'Bought quantity/value is estimated from current stock plus all recorded sold medicine units, with some older costs falling back to the current saved purchase price.'
                    : 'Bought quantity/value is estimated from current stock plus all recorded sold medicine units using your saved sales and stock cost data.',
                batchAccountingAvailable: false
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

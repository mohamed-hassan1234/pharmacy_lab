/**
 * Advanced Currency Utility for Pharmacy (Offline Somalia)
 * Logic:
 * 0.10 USD = 3 SOS
 * 0.25 USD = 6 SOS
 * 0.50 USD = 13 SOS
 * 0.75 USD = 21 SOS
 * 1.00 USD = 28 SOS
 */

const SOS_RATE = 28000; // Standard for large amounts (1$ = 28000 if thinking in thousands)
const BASE_RATE = 28;    // The base multiplier provided by user for small units

const convertUsdToSos = (usd) => {
    const wholeDollars = Math.floor(usd);
    const fraction = parseFloat((usd - wholeDollars).toFixed(2));

    let fractionSos = 0;
    if (fraction <= 0) fractionSos = 0;
    else if (fraction === 0.10) fractionSos = 3;
    else if (fraction === 0.25) fractionSos = 6;
    else if (fraction === 0.50) fractionSos = 13;
    else if (fraction === 0.75) fractionSos = 21;
    else if (fraction === 1.00 || fraction > 0.75) fractionSos = 28;
    else {
        // Fallback for non-exact fractions: simple linear for the gap
        fractionSos = Math.round(fraction * 28);
    }

    // The user provided logic like 1$ = 28 SOS for small counts.
    // If they meant 28,000 for large ones, we should be careful. 
    // Given the 0.10 = 3 logic, it seems they are working with small SOS units (perhaps x1000 elsewhere).
    // I will use his EXACT numbers:
    return (wholeDollars * 28) + fractionSos;
};

const convertSosToUsd = (sos) => {
    return (sos / 28).toFixed(2);
};

export { convertUsdToSos, convertSosToUsd };

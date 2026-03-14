const crypto = require('crypto');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 10);
const PASSWORD_MAX_LENGTH = 128;

const cleanString = (value, options = {}) => {
    const {
        trim = true,
        maxLength = 500,
        allowEmpty = false
    } = options;

    if (typeof value !== 'string') {
        return '';
    }

    const normalized = trim ? value.trim() : value;
    const limited = normalized.slice(0, maxLength);

    if (!allowEmpty && !limited) {
        return '';
    }

    return limited;
};

const normalizeEmail = (value) => cleanString(value, { maxLength: 254 }).toLowerCase();

const isValidEmail = (email) => EMAIL_REGEX.test(email);

const assertStrongPassword = (value, fieldName = 'Password') => {
    const password = typeof value === 'string' ? value : '';

    if (password.length < PASSWORD_MIN_LENGTH) {
        throw new Error(`${fieldName} must be at least ${PASSWORD_MIN_LENGTH} characters long`);
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
        throw new Error(`${fieldName} must be ${PASSWORD_MAX_LENGTH} characters or fewer`);
    }

    if (!/[A-Z]/.test(password)) {
        throw new Error(`${fieldName} must include at least one uppercase letter`);
    }

    if (!/[a-z]/.test(password)) {
        throw new Error(`${fieldName} must include at least one lowercase letter`);
    }

    if (!/\d/.test(password)) {
        throw new Error(`${fieldName} must include at least one number`);
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
        throw new Error(`${fieldName} must include at least one special character`);
    }

    return password;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasStrongJwtSecret = (value) => {
    if (typeof value !== 'string') {
        return false;
    }

    const secret = value.trim();
    if (secret.length < 32) {
        return false;
    }

    return !/(changeme|default|secret|password|1234|admin)/i.test(secret);
};

const generateTemporaryPassword = (length = 18) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    const baseLength = Math.max(length - 4, 8);
    const chars = ['A', 'a', '1', '!'];

    while (chars.length < baseLength + 4) {
        const index = crypto.randomInt(0, alphabet.length);
        chars.push(alphabet[index]);
    }

    for (let index = chars.length - 1; index > 0; index -= 1) {
        const swapIndex = crypto.randomInt(0, index + 1);
        [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
    }

    return chars.join('').slice(0, Math.max(length, 12));
};

module.exports = {
    EMAIL_REGEX,
    PASSWORD_MIN_LENGTH,
    cleanString,
    normalizeEmail,
    isValidEmail,
    assertStrongPassword,
    escapeRegex,
    hasStrongJwtSecret,
    generateTemporaryPassword
};

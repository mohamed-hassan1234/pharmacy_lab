const express = require('express');
const rateLimit = require('express-rate-limit');

const createLimiter = ({ windowMs, limit, message }) => rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ message });
    }
});

const hasDangerousKey = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some((entry) => hasDangerousKey(entry));
    }

    return Object.entries(value).some(([key, nestedValue]) => (
        key.startsWith('$') ||
        key.includes('.') ||
        hasDangerousKey(nestedValue)
    ));
};

const rejectDangerousPayload = (req, res, next) => {
    if (
        hasDangerousKey(req.body) ||
        hasDangerousKey(req.query) ||
        hasDangerousKey(req.params)
    ) {
        return res.status(400).json({ message: 'Invalid request payload' });
    }

    next();
};

const jsonBodyParser = express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' });
const urlencodedBodyParser = express.urlencoded({
    extended: false,
    limit: process.env.FORM_BODY_LIMIT || '50kb',
    parameterLimit: Number(process.env.FORM_PARAMETER_LIMIT || 100)
});

const apiLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT_MAX || 400),
    message: 'Too many requests from this IP. Please try again later.'
});

const authLimiter = createLimiter({
    windowMs: 15 * 60 * 1000,
    limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
    message: 'Too many authentication attempts. Please try again in a few minutes.'
});

module.exports = {
    apiLimiter,
    authLimiter,
    jsonBodyParser,
    urlencodedBodyParser,
    rejectDangerousPayload
};

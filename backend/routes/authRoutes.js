const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, optionalProtect, getJwtSecret, getJwtOptions } = require('../middleware/auth');
const { authLimiter } = require('../middleware/requestSecurity');
const {
    cleanString,
    normalizeEmail,
    isValidEmail,
    assertStrongPassword
} = require('../utils/security');

const ALLOWED_ROLES = ['Admin', 'Cashier', 'Doctor', 'Lab Technician'];

const generateToken = (id) => {
    return jwt.sign({ id }, getJwtSecret(), {
        ...getJwtOptions(),
        expiresIn: process.env.JWT_EXPIRES_IN || '12h'
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = cleanString(req.body?.password, {
            trim: false,
            maxLength: 256
        });

        if (!isValidEmail(email) || !password) {
            return res.status(400).json({ message: 'Valid email and password are required' });
        }

        const user = await User.findOne({ email });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (user.status === 'Inactive') {
            return res.status(403).json({ message: 'Account is suspended. Contact admin.' });
        }

        user.lastLogin = new Date();
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: Boolean(user.mustChangePassword),
            token: generateToken(user._id),
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Register a new user (Admin only or Setup)
// @route   POST /api/auth/register
router.post('/register', authLimiter, optionalProtect, async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const isFirstUser = userCount === 0;
        const name = cleanString(req.body?.name, { maxLength: 80 });
        const email = normalizeEmail(req.body?.email);
        const requestedRole = cleanString(req.body?.role, { maxLength: 40 });
        const role = isFirstUser ? 'Admin' : requestedRole;
        const password = assertStrongPassword(cleanString(req.body?.password, {
            trim: false,
            maxLength: 128
        }));
        const setupKey = cleanString(
            req.body?.setupKey || req.headers['x-setup-key'],
            { maxLength: 128, allowEmpty: true }
        );
        const requiredSetupKey = cleanString(process.env.INITIAL_ADMIN_SETUP_KEY, {
            maxLength: 128,
            allowEmpty: true
        });

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'A valid email is required' });
        }

        if (!isFirstUser && (!req.user || req.user.role !== 'Admin')) {
            return res.status(403).json({ message: 'Only admin users can create additional accounts' });
        }

        if (isFirstUser && requiredSetupKey && setupKey !== requiredSetupKey) {
            return res.status(403).json({ message: 'A valid setup key is required to create the first admin account' });
        }

        if (!ALLOWED_ROLES.includes(role)) {
            return res.status(400).json({ message: 'Invalid user role' });
        }

        if (isFirstUser && requestedRole && requestedRole !== 'Admin') {
            return res.status(400).json({ message: 'The first account must be an Admin account' });
        }

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role,
            mustChangePassword: false
        });

        const responseBody = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            mustChangePassword: Boolean(user.mustChangePassword)
        };

        if (isFirstUser) {
            responseBody.token = generateToken(user._id);
        }

        res.status(201).json(responseBody);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
router.get('/profile', protect, async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

module.exports = router;

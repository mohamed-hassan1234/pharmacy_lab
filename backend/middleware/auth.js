const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT secret is not configured');
    }

    return process.env.JWT_SECRET;
};

const getJwtOptions = () => ({
    algorithms: ['HS256'],
    issuer: process.env.JWT_ISSUER || 'clinic-pharmacy-backend',
    audience: process.env.JWT_AUDIENCE || 'clinic-pharmacy-users'
});

const extractBearerToken = (req) => {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
        return null;
    }

    return authorization.slice(7).trim() || null;
};

const loadAuthenticatedUser = async (token) => {
    const decoded = jwt.verify(token, getJwtSecret(), getJwtOptions());
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
        return { error: { status: 401, message: 'User not found' } };
    }

    if (user.status === 'Inactive') {
        return { error: { status: 403, message: 'Account is suspended. Contact admin.' } };
    }

    return { user };
};

const protect = async (req, res, next) => {
    const token = extractBearerToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const { user, error } = await loadAuthenticatedUser(token);

        if (error) {
            return res.status(error.status).json({ message: error.message });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const optionalProtect = async (req, res, next) => {
    const token = extractBearerToken(req);

    if (!token) {
        return next();
    }

    try {
        const { user, error } = await loadAuthenticatedUser(token);

        if (error) {
            return res.status(error.status).json({ message: error.message });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = {
    protect,
    optionalProtect,
    authorize,
    extractBearerToken,
    getJwtSecret,
    getJwtOptions
};

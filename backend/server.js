require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db.js');
const { hasStrongJwtSecret } = require('./utils/security');
const {
  apiLimiter,
  jsonBodyParser,
  urlencodedBodyParser,
  rejectDangerousPayload
} = require('./middleware/requestSecurity');

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || [
  'http://localhost:5010',
  'http://127.0.0.1:5010',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://lafoole.somsoftsystems.com',
  'https://www.lafoole.somsoftsystems.com',
  'https://saalim.somzaki.com',
  'https://www.saalim.somzaki.com'
].join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const validateCriticalConfig = () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!hasStrongJwtSecret(process.env.JWT_SECRET || '')) {
    throw new Error('JWT_SECRET must be set to a strong value with at least 32 characters');
  }
};

validateCriticalConfig();

// Connect to Database
connectDB();

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY || 1);
app.use(apiLimiter);
app.use(jsonBodyParser);
app.use(urlencodedBodyParser);
app.use(rejectDangerousPayload);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
    optionsSuccessStatus: 204
  })
);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Routes (to be added)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/cashier', require('./routes/cashierRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes'));

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error Mapping
app.use((err, req, res, next) => {
    void next;
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    const isProduction = process.env.NODE_ENV === 'production';
    const message = statusCode >= 500 && isProduction
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        message,
        stack: isProduction ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

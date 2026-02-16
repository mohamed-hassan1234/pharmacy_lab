require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db.js');

const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "https://homecare.nidwa.com",
      "https://www.homecare.nidwa.com",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://lafoole.somsoftsystems.com",
      "https://www.lafoole.somsoftsystems.com"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));

// Routes (to be added)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/cashier', require('./routes/cashierRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes'));
app.use('/api/lab', require('./routes/labRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/assistant', require('./routes/assistantRoutes'));

// Error Mapping
app.use((err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

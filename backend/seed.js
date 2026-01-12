require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Medicine = require('./models/Medicine');
const Sale = require('./models/Sale');
const Supplier = require('./models/Supplier');
const connectDB = require('./config/db');

const seedData = async () => {
    try {
        await connectDB();

        // Clear existing data and indexes
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.includes('users')) await mongoose.connection.db.dropCollection('users');
        if (collectionNames.includes('medicines')) await mongoose.connection.db.dropCollection('medicines');
        if (collectionNames.includes('sales')) await mongoose.connection.db.dropCollection('sales');
        if (collectionNames.includes('suppliers')) await mongoose.connection.db.dropCollection('suppliers');
        if (collectionNames.includes('debts')) await mongoose.connection.db.dropCollection('debts');

        // Create Admin
        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@clinic.com',
            password: 'password123',
            role: 'Admin'
        });

        // Create Cashier
        const cashier = await User.create({
            name: 'Sahal Cashier',
            email: 'cashier@clinic.com',
            password: 'password123',
            role: 'Cashier'
        });

        // Create Supplier
        const supplier = await Supplier.create({
            name: 'Bakara Medical Wholesalers',
            source: 'Bakara Market',
            note: 'Main supplier for essential meds',
            addedBy: admin._id
        });

        console.log('Users and Supplier created');

        // Create Medicines (SOS Pricing)
        const medicines = await Medicine.insertMany([
            {
                name: 'Paracetamol 500mg',
                category: 'Analgesic',
                supplier: supplier._id,
                purchasePricePerBox: 28000, // 1 USD
                unitsPerBox: 100,
                sellingPricePerUnit: 500,   // Total value: 50,000 SOS
                sellingPricePerBox: 45000,  // Discounted box price
                boxesInStock: 10,
                totalUnitsInStock: 1000,
                expiryDate: new Date('2026-12-31')
            },
            {
                name: 'Amoxicillin 250mg',
                category: 'Antibiotic',
                supplier: supplier._id,
                purchasePricePerBox: 70000, // 2.5 USD
                unitsPerBox: 50,
                sellingPricePerUnit: 2000,  // Total value: 100,000 SOS
                sellingPricePerBox: 90000,  // Discounted box price
                boxesInStock: 20,
                totalUnitsInStock: 1000,
                expiryDate: new Date('2025-06-30')
            }
        ]);

        console.log('Medicines seeded');

        // Create Sales (SOS Based)
        const months = [1, 2, 3, 4, 5, 6];
        for (const m of months) {
            await Sale.create({
                invoiceNumber: `INV-00${m}`,
                cashierId: cashier._id,
                customerName: 'Walk-in Customer',
                items: [{
                    medicineId: medicines[0]._id,
                    name: medicines[0].name,
                    sellType: 'UNIT',
                    quantity: 10 * m,
                    unitPrice: 500,
                    total: 5000 * m
                }],
                totalAmount: 5000 * m,
                totalCost: 2800 * m,
                profit: 2200 * m,
                paymentType: 'CASH',
                status: 'PAID',
                createdAt: new Date(2025, m, 10)
            });
        }

        console.log('Sales seeded');
        process.exit();
    } catch (error) {
        console.error('Seed Error:', error);
        process.exit(1);
    }
};

seedData();

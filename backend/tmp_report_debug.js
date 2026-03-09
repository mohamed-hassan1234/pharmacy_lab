require('dotenv').config();
const mongoose = require('mongoose');
const Sale = require('./models/Sale');
const Medicine = require('./models/Medicine');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const sales = await Sale.find({ invoiceNumber: { $in: ['INV-0025', 'INV-0026', 'INV-0027', 'INV-0028', 'INV-0029', 'INV-0030'] } })
    .sort({ createdAt: -1 })
    .lean();

  const medicineIds = [...new Set(
    sales.flatMap((sale) => (sale.items || []).map((item) => item.medicineId).filter(Boolean))
  )];
  const medicines = await Medicine.find({ _id: { $in: medicineIds } }).lean();

  console.log(JSON.stringify({ sales, medicines }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

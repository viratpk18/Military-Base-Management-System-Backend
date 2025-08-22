// routes/transfer.routes.js
import express from 'express';
import {
  createTransferBill,
  deleteTransferBill,
  getAllTransferBills,
  getTransferBillById
} from '../controllers/transfer.Controller.js';
import {
  verifyAccessToken,
  verifyRole
} from '../middleware/verifyToken.js';

const router = express.Router();

// 🚚 Create a new transfer bill
router.post(
  '/create',
  verifyAccessToken,
  verifyRole(['logistics_officer', 'admin']),
  createTransferBill
);

// ❌ Delete a transfer bill by ID
router.delete(
  '/delete/:id',
  verifyAccessToken,
  verifyRole(['logistics_officer', 'admin']),
  deleteTransferBill
);

// 📃 Get all transfer bills
router.get(
  '/getMy',
  verifyAccessToken,
  verifyRole(['logistics_officer', 'admin']),
  getAllTransferBills
);

// 🔍 Get single transfer bill by ID
router.get(
  '/get/:id',
  verifyAccessToken,
  getTransferBillById
);

export default router;

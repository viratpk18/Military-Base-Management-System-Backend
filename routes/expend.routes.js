import express from 'express';
import {
  createExpenditure,
  markAssignedAsExpended,
  deleteExpenditure,
  getAllMyExpenditures,
  getExpenditureById
} from '../controllers/expend.Controller.js';

import {
  verifyAccessToken,
  verifyRole
} from '../middleware/verifyToken.js';

const router = express.Router();

// 💸 Create a new expenditure
router.post(
  '/create',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  createExpenditure
);

// 🔄 Mark assigned assets as expended (used in field)
router.post(
  '/markAssignedAsExpended/:id',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  markAssignedAsExpended
);

// ❌ Delete an expenditure by ID
router.delete(
  '/delete/:id',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  deleteExpenditure
);

// 📋 Get all expenditures for your base
router.get(
  '/getMy',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  getAllMyExpenditures
);

// 🔍 Get single expenditure by ID
router.get(
  '/get/:id',
  verifyAccessToken,
  getExpenditureById
);

export default router;

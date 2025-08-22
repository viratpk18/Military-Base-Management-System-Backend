import express from 'express';
import {
  createAssignment,
  deleteAssignment,
  getAllMyAssignments,
  getAssignmentById
} from '../controllers/assign.Controller.js';

import {
  verifyAccessToken,
  verifyRole
} from '../middleware/verifyToken.js';

const router = express.Router();

// 📦 Assign asset to personnel
router.post(
  '/create',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  createAssignment
);

// ❌ Delete an assignment by ID
router.delete(
  '/delete/:id',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  deleteAssignment
);

// 📋 Get all assignments for your base
router.get(
  '/getMy',
  verifyAccessToken,
  verifyRole(['base_commander', 'admin']),
  getAllMyAssignments
);

// 🔍 Get single assignment by ID
router.get(
  '/get/:id',
  verifyAccessToken,
  getAssignmentById
);

export default router;

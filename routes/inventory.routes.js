import express from 'express';
import { verifyAccessToken, verifyRefreshToken, verifyRole } from '../middleware/verifyToken.js';
import {
    getMyStockDetails,
    getAllStockDetails
} from '../controllers/inventory.Controller.js';

const router = express.Router();

// ✅ Requires logged-in user
router.get('/my', verifyAccessToken, getMyStockDetails);

// ✅ For admins
router.get('/', verifyAccessToken, getAllStockDetails); //verifyRole(['admin'])

export default router;

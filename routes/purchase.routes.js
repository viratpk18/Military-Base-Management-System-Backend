// routes/purchase.routes.js
import express from 'express';
import {
    createPurchaseBill,
    updatePurchaseBill,
    deletePurchaseBill,
    getAllPurchaseBills,
    getPurchaseBillById
} from '../controllers/purchase.Controller.js';
import { verifyAccessToken, verifyRefreshToken, verifyRole } from '../middleware/verifyToken.js';


const router = express.Router();

// 📦 Create a new purchase bill
router.post('/create', verifyAccessToken ,verifyRole(['logistics_officer','admin']), createPurchaseBill);

// ✏️ Update a purchase bill by ID
router.put('/update/:id',verifyAccessToken ,verifyRole(['logistics_officer','admin']), updatePurchaseBill);

// ❌ Delete a purchase bill by ID
router.delete('/delete/:id',verifyAccessToken ,verifyRole(['logistics_officer','admin']), deletePurchaseBill);

// 📃 Get all purchase bills
router.get('/getMy',verifyAccessToken, verifyRole(['logistics_officer','admin']), getAllPurchaseBills);

// 🔍 Get single purchase bill by ID
router.get('/get/:id',verifyAccessToken, getPurchaseBillById);

export default router;

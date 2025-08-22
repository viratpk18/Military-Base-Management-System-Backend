import express from 'express';
import { verifyAccessToken, verifyRefreshToken, verifyRole } from '../middleware/verifyToken.js';
import {
    getAssetSummaries,
    handler
} from '../controllers/dataSummary.Controller.js';

const router = express.Router();


// ✅ For all
router.get('/', verifyAccessToken, getAssetSummaries); //verifyRole(['admin'])

router.get('/hit', handler);

export default router;

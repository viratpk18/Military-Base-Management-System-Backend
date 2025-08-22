import express from 'express';
import { createBase, getAllBases, getBaseById, updateBase, deleteBase } from '../controllers/base.Controller.js';
import { createAsset, getAllAssets, getAssetById, updateAsset, deleteAsset } from '../controllers/asset.Controller.js';
import { verifyAccessToken,verifyRole } from '../middleware/verifyToken.js';

const router = express.Router();

// asset.routes.js
router.post('/assets/create',verifyAccessToken, verifyRole(['admin']), createAsset);
router.get('/assets/get', getAllAssets);
router.get('/assets/get/:id', getAssetById);
router.put('/assets/update/:id',verifyAccessToken, verifyRole(['admin']), updateAsset);
router.delete('/assets/delete/:id',verifyAccessToken, verifyRole(['admin']), deleteAsset);

// base.routes.js
router.post('/bases/create',verifyAccessToken, verifyRole(['admin']), createBase);
router.get('/bases/get', getAllBases);
router.get('/bases/get/:id', getBaseById);
router.put('/bases/update/:id',verifyAccessToken, verifyRole(['admin']), updateBase);
router.delete('/bases/delete/:id',verifyAccessToken, verifyRole(['admin']), deleteBase);


export default router;

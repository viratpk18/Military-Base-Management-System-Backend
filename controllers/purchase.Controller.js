// controllers/purchase.controller.js
import Purchase from '../DB/models/purchase.model.js';
import { purchaseAsset } from './inventory.Controller.js';
import Asset from '../DB/models/asset.model.js';
import Base from '../DB/models/base.model.js';
import { createLog } from './movement.Controller.js';

/**
 * Create a new purchase bill and update inventory
 */
export const createPurchaseBill = async (req, res) => {
  try {
    const base = req.user.baseId || req.body.base;
    const { items, invoiceNumber, remarks, purchaseDate } = req.body;

    if (!base) return res.status(400).json({ message: 'Base information is required' });

    // Ensure base exists
    const baseExists = await Base.findById(base);
    if (!baseExists) return res.status(400).json({ message: 'Invalid base ID' });

    // Ensure all assets exist
    for (const item of items) {
      const assetExists = await Asset.findById(item.asset);
      if (!assetExists) return res.status(400).json({ message: `Invalid asset ID: ${item.asset}` });
    }

    // Create purchase bill
    const newPurchase = new Purchase({ base, items, purchasedBy: req.user.id, invoiceNumber, remarks, purchaseDate });
    await newPurchase.save();

    // Update inventory for each asset
    for (const item of items) {
      await purchaseAsset(base, item.asset, item.quantity);
    }

    await createLog({
      actionType: 'purchase',
      items, // array of { asset, quantity, unitPrice }
      base,
      performedBy: req.user.id,
      referenceId: newPurchase._id,
      remarks: remarks || `Invoice: ${invoiceNumber}`
    });

    res.status(201).json({ message: 'Purchase bill created successfully', purchase: newPurchase });
  } catch (error) {
    console.error('Error creating purchase bill:', error);
    res.status(500).json({
      message: 'Failed to create purchase',
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Update an existing purchase bill and manage inventory accordingly
 */
export const updatePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, remarks, invoiceNumber, purchaseDate } = req.body;

    const existingPurchase = await Purchase.findById(id);
    if (!existingPurchase) return res.status(404).json({ message: 'Purchase bill not found' });

    const userBaseId = req.user.baseId?.toString(); // optional chaining and stringify for safe compare
    const purchaseBaseId = existingPurchase.base.toString();

    // 🔒 Check if user is authorized to update this base's bill
    if (userBaseId && userBaseId !== purchaseBaseId) {
      return res.status(403).json({ message: 'Access denied. You can only update purchase bills for your base.' });
    }

    // Reverse old inventory changes
    for (const oldItem of existingPurchase.items) {
      await purchaseAsset(existingPurchase.base, oldItem.asset, -oldItem.quantity);
    }

    // Apply new inventory changes
    for (const newItem of items) {
      await purchaseAsset(existingPurchase.base, newItem.asset, newItem.quantity);
    }

    // Update purchase bill fields
    existingPurchase.items = items;
    existingPurchase.remarks = remarks;
    existingPurchase.invoiceNumber = invoiceNumber;
    existingPurchase.purchaseDate = purchaseDate;

    await existingPurchase.save();

    await createLog({
      actionType: 'purchase',
      items, // updated list
      base: existingPurchase.base,
      performedBy: req.user.id,
      referenceId: existingPurchase._id,
      remarks: `Purchase bill updated. Invoice: ${invoiceNumber}`
    });


    res.status(200).json({ message: 'Purchase bill updated successfully', purchase: existingPurchase });
  } catch (error) {
    console.error('Error updating purchase bill:', error);
    res.status(500).json({
      message: 'Failed to update purchase',
      error: error.message || 'Internal server error'
    });
  }
};


/**
 * Delete a purchase bill and roll back inventory changes
 */
export const deletePurchaseBill = async (req, res) => {
  try {
    const { id } = req.params;

    const purchase = await Purchase.findById(id);
    if (!purchase) return res.status(404).json({ message: 'Purchase bill not found' });

    const userBaseId = req.user.baseId?.toString();
    const purchaseBaseId = purchase.base.toString();

    // 🔒 Ensure user is allowed to delete this purchase
    if (userBaseId && userBaseId !== purchaseBaseId) {
      return res.status(403).json({ message: 'Access denied. You can only delete purchase bills for your base.' });
    }

    // Rollback inventory
    for (const item of purchase.items) {
      await purchaseAsset(purchase.base, item.asset, -item.quantity);
    }

    await purchase.deleteOne();

    await createLog({
      actionType: 'purchase',
      items: purchase.items.map(item => ({
        asset: item.asset,
        quantity: -item.quantity, // show reversal
        unitPrice: item.unitPrice || 0
      })),
      base: purchase.base,
      performedBy: req.user.id,
      referenceId: purchase._id,
      remarks: `Purchase bill deleted. Invoice: ${purchase.invoiceNumber}`
    });

    res.status(200).json({ message: 'Purchase bill deleted and inventory updated' });
  } catch (error) {
    console.error('Error deleting purchase bill:', error);
    res.status(500).json({
      message: 'Failed to delete purchase',
      error: error.message || 'Internal server error'
    });
  }
};

export const getAllPurchaseBills = async (req, res) => {
  try {
    const { page = 1, limit = 10, baseId, assetId, date, dateFrom, dateTo } = req.query;

    const queryBase = req.user.role !== 'admin' ? req.user.baseId : baseId;

    if (!queryBase) {
      return res.status(400).json({ message: 'Base ID is required for fetching assignments' });
    }
    const query = { base: queryBase };

    // const query = {};

    // Base filtering (for admin/non-admin users)
    // if (req.user.role !== 'admin') {
    //   query.base = req.user.baseId;
    // } else if (baseId) {
    //   query.base = baseId;
    // }

    // Asset filtering
    if (assetId) {
      query['items.asset'] = assetId;
    }

    // const dateQuery = {};
    // if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    // if (dateTo) dateQuery.$lte = new Date(dateTo);
    // if (Object.keys(dateQuery).length > 0) {
    //   query.purchaseDate = dateQuery;
    // }

    // Date filtering
    if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.purchaseDate = { $gte: startDate, $lte: endDate };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'base', select: 'name state district' },
        { path: 'items.asset', select: 'name category unit' }
      ],
      sort: { purchaseDate: -1 } // Newest first
    };

    const result = await Purchase.paginate(query, options);

    res.status(200).json({
      purchases: result.docs,
      total: result.totalDocs,
      limit: result.limit,
      page: result.page,
      pages: result.totalPages
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch purchase bills',
      error: error.message
    });
  }
};

export const getPurchaseBillById = async (req, res) => {
  try {
    const { id } = req.params;

    const bill = await Purchase.findById(id)
      .populate('base', 'name state district')
      .populate('items.asset', 'name category unit');

    if (!bill) {
      return res.status(404).json({ message: 'Purchase bill not found' });
    }

    res.status(200).json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch purchase bill', error: error.message });
  }
};

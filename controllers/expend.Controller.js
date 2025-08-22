import Expend from '../DB/models/expend.model.js';
import Asset from '../DB/models/asset.model.js';
import Base from '../DB/models/base.model.js';
import { expendAsset, reverseExpendAsset, assignedToExpendAsset } from './inventory.Controller.js';
import Assign from '../DB/models/assign.model.js';
import { createLog } from './movement.Controller.js';

/**
 * Create a new expenditure record and update inventory
 */
export const createExpenditure = async (req, res) => {
    try {
        const base = req.user.baseId || req.body.base;
        const { expendedBy, items, remarks, expendDate } = req.body;

        if (!base || !expendedBy) {
            return res.status(400).json({ message: 'Base and expendedBy are required' });
        }

        const baseExists = await Base.findById(base);
        if (!baseExists) {
            return res.status(400).json({ message: 'Invalid base ID' });
        }

        for (const item of items) {
            const assetExists = await Asset.findById(item.asset);
            if (!assetExists) return res.status(400).json({ message: `Invalid asset ID: ${item.asset}` });
        }

        const newExpenditure = new Expend({
            base,
            expendedBy,
            items,
            approvedBy: req.user.id,
            remarks,
            expendDate
        });

        for (const item of items) {
            await expendAsset(base, item.asset, item.quantity);
        }

        await newExpenditure.save();

        await createLog({
            actionType: 'expenditure',
            items, // include asset, quantity
            base,
            performedBy: req.user.id,
            referenceId: newExpenditure._id,
            remarks: remarks || `Expended by ${expendedBy}`
        });


        res.status(201).json({ message: 'Asset(s) expended successfully', expenditure: newExpenditure });
    } catch (error) {
        console.error('Error creating expenditure:', error);
        res.status(500).json({
            message: 'Failed to create expenditure',
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Mark assigned asset(s) as expended
 * - Moves quantity from assigned to expended
 * - Marks the corresponding assignment items as isExpended: true
 * - Creates an expenditure record
 */
export const markAssignedAsExpended = async (req, res) => {
    try {
        const base = req.user.baseId || req.body.base;
        const assignedId = req.params.id
        const { expendedBy, items, remarks, expendDate } = req.body;

        if (!base || !expendedBy || !assignedId) {
            return res.status(400).json({ message: 'Base, assignedId, and expendedBy are required' });
        }

        const assignment = await Assign.findById(assignedId);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        const expendDoc = new Expend({
            base,
            expendedBy,
            items,
            approvedBy: req.user.id,
            remarks,
            expendDate
        });

        // Update inventory and mark assignment items
        for (const item of items) {
            await assignedToExpendAsset(base, item.asset, item.quantity);

            const assignedItem = assignment.items.find(i => i.asset.toString() === item.asset);
            if (assignedItem) {
                assignedItem.isExpended = true;
            }
        }

        // ✅ Check if all items are expended now
        const allItemsExpended = assignment.items.every(i => i.isExpended);
        if (allItemsExpended) {
            assignment.isExpended = true;
        }

        await expendDoc.save();
        await assignment.save();

        await createLog({
            actionType: 'expenditure',
            items, // same format
            base,
            performedBy: req.user.id,
            referenceId: expendDoc._id,
            remarks: remarks || `Expenditure from assignment ${assignedId}`
        });


        res.status(201).json({
            message: 'Assigned asset(s) marked as expended successfully',
            expenditure: expendDoc
        });
    } catch (error) {
        console.error('Error marking assigned as expended:', error);
        res.status(500).json({
            message: 'Failed to mark assigned asset(s) as expended',
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Delete an expenditure (reverse inventory if needed)
 */
export const deleteExpenditure = async (req, res) => {
    try {
        const { id } = req.params;

        const expenditure = await Expend.findById(id);
        if (!expenditure) return res.status(404).json({ message: 'Expenditure not found' });

        const userBaseId = req.user.baseId?.toString();
        const expendBaseId = expenditure.base.toString();

        if (userBaseId && userBaseId !== expendBaseId) {
            return res.status(403).json({ message: 'Access denied. You can only delete expenditures from your base.' });
        }

        for (const item of expenditure.items) {
            await reverseExpendAsset(expenditure.base, item.asset, item.quantity);
        }

        await expenditure.deleteOne();

        await createLog({
            actionType: 'expenditure',
            items: expenditure.items.map(item => ({
                asset: item.asset,
                quantity: -item.quantity, // reversal
                unitPrice: item.unitPrice || 0
            })),
            base: expenditure.base,
            performedBy: req.user.id,
            referenceId: expenditure._id,
            remarks: `Expenditure reversed`
        });

        res.status(200).json({ message: 'Expenditure deleted successfully' });
    } catch (error) {
        console.error('Error deleting expenditure:', error);
        res.status(500).json({
            message: 'Failed to delete expenditure',
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Get all expenditures for user's base
 */
export const getAllMyExpenditures = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            assetId,
            date,
            baseId,
            dateFrom, dateTo
        } = req.query;

        const baseToCheck = req.user.role !== 'admin' ? req.user.baseId : baseId;

        if (!baseToCheck) {
            return res.status(400).json({ message: 'Base ID is required for fetching expenditures' });
        }

        const filter = { base: baseToCheck };

        if (assetId) {
            filter['items.asset'] = assetId;
        }

        // if (date) {
        //     const startDate = new Date(date);
        //     startDate.setHours(0, 0, 0, 0);
        //     const endDate = new Date(date);
        //     endDate.setHours(23, 59, 59, 999);
        //     filter.expendDate = { $gte: startDate, $lte: endDate };
        // }

        // Date filtering
        if (dateFrom && dateTo) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            filter.expendDate = { $gte: startDate, $lte: endDate };
        }

        const expenditures = await Expend.find(filter)
            .populate('base', 'name state district')
            .populate('items.asset', 'name category unit')
            .sort({ expendDate: -1 });

        const paginate = (array, page, limit) => {
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            return array.slice(startIndex, endIndex);
        };

        const paginated = paginate(expenditures, page, limit);

        res.status(200).json({
            expenditures: paginated,
            total: expenditures.length,
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(expenditures.length / limit)
        });
    } catch (error) {
        console.error('Error fetching expenditures:', error);
        res.status(500).json({ message: 'Failed to fetch expenditures', error: error.message });
    }
};

/**
 * Get single expenditure by ID
 */
export const getExpenditureById = async (req, res) => {
    try {
        const { id } = req.params;

        const expenditure = await Expend.findById(id)
            .populate('base', 'name state district')
            .populate('items.asset', 'name category unit')
            .populate('approvedBy', 'name role')

        if (!expenditure) return res.status(404).json({ message: 'Expenditure not found' });

        res.status(200).json(expenditure);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch expenditure', error: error.message });
    }
};

// controllers/transfer.controller.js
import Transfer from '../DB/models/transfer.model.js';
import { reverseTransferAsset, transferAsset } from './inventory.Controller.js';
import Asset from '../DB/models/asset.model.js';
import Base from '../DB/models/base.model.js';
import { createLog } from './movement.Controller.js';

/**
 * Create a new transfer bill and update inventory
 */
export const createTransferBill = async (req, res) => {
    try {
        const fromBase = req.user.baseId || req.body.fromBase;
        const { toBase, items, invoiceNumber, remarks, transferDate } = req.body;

        if (!fromBase || !toBase) return res.status(400).json({ message: 'Both source and destination bases are required' });

        if (fromBase === toBase) return res.status(400).json({ message: 'Source and destination bases cannot be the same' });

        const [fromBaseExists, toBaseExists] = await Promise.all([
            Base.findById(fromBase),
            Base.findById(toBase)
        ]);

        if (!fromBaseExists || !toBaseExists) {
            return res.status(400).json({ message: 'Invalid base ID(s)' });
        }

        for (const item of items) {
            const assetExists = await Asset.findById(item.asset);
            if (!assetExists) return res.status(400).json({ message: `Invalid asset ID: ${item.asset}` });
        }

        const newTransfer = new Transfer({
            fromBase,
            toBase,
            items,
            transferredBy: req.user.id,
            invoiceNumber,
            remarks,
            transferDate
        });

        for (const item of items) {
            await transferAsset(fromBase, toBase, item.asset, item.quantity);
        }

        await newTransfer.save();

        await createLog({
            actionType: 'transfer',
            items,
            base: fromBase, // the initiating base
            performedBy: req.user.id,
            referenceId: newTransfer._id,
            remarks: remarks || `Transfer to ${toBaseExists.name}`
        });


        res.status(201).json({ message: 'Transfer bill created successfully', transfer: newTransfer });
    } catch (error) {
        console.error('Error creating transfer bill:', error);
        res.status(500).json({
            message: `Failed to create transfer bill: ${error}`,
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Delete a transfer bill and rollback inventory
 */
export const deleteTransferBill = async (req, res) => {
    try {
        const { id } = req.params;

        const transfer = await Transfer.findById(id)
            .populate('fromBase', 'name state district')
            .populate('toBase', 'name state district');

        if (!transfer) return res.status(404).json({ message: 'Transfer bill not found' });

        const userBaseId = req.user.baseId?.toString();
        const transferFromBaseId = transfer.fromBase.toString();

        if (userBaseId && userBaseId !== transferFromBaseId) {
            return res.status(403).json({ message: 'Access denied. You can only delete transfer bills from your base.' });
        }

        // Reverse inventory change
        for (const item of transfer.items) {
            await reverseTransferAsset(transfer.fromBase, transfer.toBase, item.asset, item.quantity);
        }

        await transfer.deleteOne();

        await createLog({
            actionType: 'transfer',
            items: transfer.items.map(item => ({
                asset: item.asset,
                quantity: -item.quantity
            })),
            base: transfer.fromBase,
            performedBy: req.user.id,
            referenceId: transfer._id,
            remarks: `Transfer reversed (originally to ${transfer.toBase.name})`
        });


        res.status(200).json({ message: 'Transfer bill deleted and inventory rolled back' });
    } catch (error) {
        console.error('Error deleting transfer bill:', error);
        res.status(500).json({
            message: 'Failed to delete transfer bill',
            error: error.message || 'Internal server error'
        });
    }
};

export const getAllTransferBills = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            baseId,
            assetId,
            date,
            dateFrom,
            dateTo
        } = req.query;

        const baseToCheck = req.user.role !== 'admin' ? req.user.baseId : baseId;

        if (!baseToCheck) {
            return res.status(400).json({ message: 'Base ID is required for fetching transfer records' });
        }

        const baseFilter = {
            $or: [
                { fromBase: baseToCheck },
                { toBase: baseToCheck }
            ]
        };

        if (assetId) {
            baseFilter['items.asset'] = assetId;
        }

        // if (date) {
        //     const startDate = new Date(date);
        //     startDate.setHours(0, 0, 0, 0);
        //     const endDate = new Date(date);
        //     endDate.setHours(23, 59, 59, 999);
        //     baseFilter.transferDate = { $gte: startDate, $lte: endDate };
        // }

        if (dateFrom && dateTo) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            baseFilter.transferDate = { $gte: startDate, $lte: endDate };
            // baseFilter.updatedAt = { $gte: startDate, $lte: endDate };
        }

        // Fetch all matching transfers
        const transfers = await Transfer.find(baseFilter)
            .populate('fromBase', 'name state district')
            .populate('toBase', 'name state district')
            .populate('items.asset', 'name category unit')
            .sort({ transferDate: -1 });

        // Split into transferIn and transferOut
        const transferOut = transfers.filter(
            t => t.fromBase._id.toString() === baseToCheck.toString()
        );
        const transferIn = transfers.filter(
            t => t.toBase._id.toString() === baseToCheck.toString()
        );

        // Manual pagination
        const paginate = (array, page, limit) => {
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            return array.slice(startIndex, endIndex);
        };

        const paginatedIn = paginate(transferIn, page, limit);
        const paginatedOut = paginate(transferOut, page, limit);

        res.status(200).json({
            transferIn: paginatedIn,
            transferOut: paginatedOut,
            totalIn: transferIn.length,
            totalOut: transferOut.length,
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalPagesIn: Math.ceil(transferIn.length / limit),
            totalPagesOut: Math.ceil(transferOut.length / limit)
        });

    } catch (error) {
        console.error('Error fetching transfers:', error);
        res.status(500).json({ message: 'Failed to fetch transfer bills', error: error.message });
    }
};

export const getTransferBillById = async (req, res) => {
    try {
        const { id } = req.params;

        const bill = await Transfer.findById(id)
            .populate('fromBase', 'name state district')
            .populate('toBase', 'name state district')
            .populate('items.asset', 'name category unit');

        if (!bill) return res.status(404).json({ message: 'Transfer bill not found' });

        res.status(200).json(bill);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch transfer bill', error: error.message });
    }
};

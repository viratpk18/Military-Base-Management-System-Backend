import Assign from '../DB/models/assign.model.js';
import Asset from '../DB/models/asset.model.js';
import Base from '../DB/models/base.model.js';
import { assignAsset, reverseAssignAsset } from './inventory.Controller.js';
import { createLog } from './movement.Controller.js';

/**
 * Create a new assignment and update inventory
 */
export const createAssignment = async (req, res) => {
    try {
        const base = req.user.baseId || req.body.base;
        const { assignedTo, items, remarks, assignDate } = req.body;

        if (!base || !assignedTo) {
            return res.status(400).json({ message: 'Base and assignedTo are required' });
        }

        const baseExists = await Base.findById(base);
        if (!baseExists) {
            return res.status(400).json({ message: 'Invalid base ID' });
        }

        for (const item of items) {
            const assetExists = await Asset.findById(item.asset);
            if (!assetExists) return res.status(400).json({ message: `Invalid asset ID: ${item.asset}` });
        }

        const newAssignment = new Assign({
            base,
            assignedTo,
            items,
            assignedBy: req.user.id,
            remarks,
            assignDate
        });

        for (const item of items) {
            await assignAsset(base, item.asset, item.quantity);
        }
        await newAssignment.save();

        await newAssignment.save();

        await createLog({
            actionType: 'assignment',
            items,
            base,
            performedBy: req.user.id,
            referenceId: newAssignment._id,
            remarks: remarks || `Assigned to user ${assignedTo}`
        });


        res.status(201).json({ message: 'Asset(s) assigned successfully', assignment: newAssignment });
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(500).json({
            message: 'Failed to create assignment',
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Delete an assignment (rollback logic can be added later)
 */
export const deleteAssignment = async (req, res) => {
    try {
        const { id } = req.params;

        const assignment = await Assign.findById(id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        const userBaseId = req.user.baseId?.toString();
        const assignBaseId = assignment.base.toString();

        if (userBaseId && userBaseId !== assignBaseId) {
            return res.status(403).json({ message: 'Access denied. You can only delete assignments from your base.' });
        }

        for (const item of assignment.items) {
            await reverseAssignAsset(assignment.base, item.asset, item.quantity);
        }

        await assignment.deleteOne();

        await createLog({
            actionType: 'assignment',
            items: assignment.items.map(item => ({
                asset: item.asset,
                quantity: -item.quantity
            })),
            base: assignment.base,
            performedBy: req.user.id,
            referenceId: assignment._id,
            remarks: `Assignment to user ${assignment.assignedTo} reversed`
        });

        res.status(200).json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error('Error deleting assignment:', error);
        res.status(500).json({
            message: 'Failed to delete assignment',
            error: error.message || 'Internal server error'
        });
    }
};

/**
 * Get all assignments for user's base
 */
export const getAllMyAssignments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            assetId,
            date,
            baseId,
            dateFrom,
            dateTo
        } = req.query;

        const baseToCheck = req.user.role !== 'admin' ? req.user.baseId : baseId;

        if (!baseToCheck) {
            return res.status(400).json({ message: 'Base ID is required for fetching assignments' });
        }

        const filter = { base: baseToCheck };

        filter.isExpended = false;

        if (assetId) {
            filter['items.asset'] = assetId;
        }

        // if (date) {
        //     const startDate = new Date(date);
        //     startDate.setHours(0, 0, 0, 0);
        //     const endDate = new Date(date);
        //     endDate.setHours(23, 59, 59, 999);
        //     filter.assignDate = { $gte: startDate, $lte: endDate };
        // }

        if (dateFrom && dateTo) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            filter.assignDate = { $gte: startDate, $lte: endDate };
        }

        const assignments = await Assign.find(filter)
            .populate('base', 'name state district')
            .populate('items.asset', 'name category unit')
            .sort({ assignDate: -1 });

        // Manual pagination
        const paginate = (array, page, limit) => {
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            return array.slice(startIndex, endIndex);
        };

        const paginated = paginate(assignments, page, limit);

        res.status(200).json({
            assignments: paginated,
            total: assignments.length,
            currentPage: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(assignments.length / limit)
        });

    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: 'Failed to fetch assignments', error: error.message });
    }
};

/**
 * Get single assignment by ID
 */
export const getAssignmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const assignment = await Assign.findById(id)
            .populate('base', 'name state district')
            .populate('items.asset', 'name category unit');

        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        res.status(200).json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch assignment', error: error.message });
    }
};

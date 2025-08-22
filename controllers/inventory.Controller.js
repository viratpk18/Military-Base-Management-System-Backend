import Inventory from '../DB/models/inventory.model.js';
import Asset from '../DB/models/asset.model.js';

/**
 * Ensures the inventory document exists. If not, it creates one.
 */
export const ensureInventory = async (baseId, assetId) => {
    let inventory = await Inventory.findOne({ base: baseId, asset: assetId });

    if (!inventory) {
        inventory = await Inventory.create({
            asset: assetId,
            base: baseId,
            quantity: 0,
            purchased: 0,
            expended: 0,
            assigned: 0,
            transferredOut: 0,
            transferredIn: 0
        });
    }

    return inventory;
};

/**
 * Handle asset purchase (adds to quantity and purchased count)
 */
export const purchaseAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    inventory.purchased += qty;
    inventory.quantity += qty;

    return await inventory.save();
};

/**
 * Handle asset expenditure (removes from quantity and adds to expended)
 */
export const expendAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    if (inventory.quantity < qty) {
        throw new Error('Not enough stock to expend.');
    }

    inventory.expended += qty;
    inventory.quantity -= qty;

    return await inventory.save();
};

/**
 * Reverse asset expenditure (moves from expended back to quantity)
 */
export const reverseExpendAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    if (inventory.expended < qty) {
        throw new Error('Not enough expended quantity to reverse.');
    }

    inventory.expended -= qty;
    inventory.quantity += qty;

    return await inventory.save();
};

/**
 * Convert assigned asset to expended (used/destroyed/lost).
 * - Decreases `assigned`
 * - Increases `expended`
 */
export const assignedToExpendAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    if (inventory.assigned < qty) {
        throw new Error('Cannot expend. Assigned quantity is less than specified.');
    }

    inventory.assigned -= qty;
    inventory.expended += qty;

    return await inventory.save();
};


/**
 * Assign asset to personnel (reduces quantity, increases assigned)
 */
export const assignAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    if (inventory.quantity < qty) {
        throw new Error('Not enough stock to assign.');
    }

    inventory.assigned += qty;
    inventory.quantity -= qty;

    return await inventory.save();
};

/**
 * Reverse an asset assignment from personnel.
 * - Increases quantity back to base
 * - Decreases assigned count
 */
export const reverseAssignAsset = async (baseId, assetId, qty) => {
    const inventory = await ensureInventory(baseId, assetId);

    if (inventory.assigned < qty) {
        throw new Error('Cannot reverse assignment. Assigned quantity is less than specified.');
    }

    inventory.quantity += qty;
    inventory.assigned -= qty;

    return await inventory.save();
};


/**
 * Transfer asset to another base.
 * Updates transferredOut on source base and transferredIn on destination base.
 */
export const transferAsset = async (fromBaseId, toBaseId, assetId, qty) => {
    if (fromBaseId.toString() === toBaseId.toString()) {
        throw new Error('Source and destination base cannot be the same.');
    }

    // Deduct from source base
    const fromInventory = await ensureInventory(fromBaseId, assetId);
    if (fromInventory.quantity < qty) {
        throw new Error('Not enough stock to transfer.');
    }

    fromInventory.transferredOut += qty;
    fromInventory.quantity -= qty;
    await fromInventory.save();

    // Add to destination base
    const toInventory = await ensureInventory(toBaseId, assetId);
    toInventory.transferredIn += qty;
    toInventory.quantity += qty;
    await toInventory.save();

    return {
        from: fromInventory,
        to: toInventory
    };
};

/**
 * Reverse a previously recorded transfer between bases.
 * It restores the original inventory state:
 * - Adds quantity back to the source base
 * - Removes quantity from the destination base
 */
export const reverseTransferAsset = async (fromBaseId, toBaseId, assetId, qty) => {
    if (fromBaseId.toString() === toBaseId.toString()) {
        throw new Error('Source and destination base cannot be the same.');
    }

    // Add back to source base (undo deduction)
    const fromInventory = await ensureInventory(fromBaseId, assetId);
    fromInventory.quantity += qty;
    fromInventory.transferredOut -= qty;
    if (fromInventory.transferredOut < 0) fromInventory.transferredOut = 0;
    await fromInventory.save();

    // Remove from destination base (undo addition)
    const toInventory = await ensureInventory(toBaseId, assetId);
    if (toInventory.quantity < qty) {
        throw new Error('Cannot reverse transfer. Destination base has already used some stock.');
    }

    toInventory.quantity -= qty;
    toInventory.transferredIn -= qty;
    if (toInventory.transferredIn < 0) toInventory.transferredIn = 0;
    await toInventory.save();

    return {
        reversedFrom: fromInventory,
        reversedTo: toInventory
    };
};


/**
 * GET /api/inventory/my
 * Get inventory for the current user's base with server-side filtering
 */
export const getMyStockDetails = async (req, res) => {
    try {
        const baseId = req.user.baseId;
        const {
            asset,
            category,
            minQuantity,
            maxQuantity,
            showLowStock,
            dateFrom,
            dateTo,
            sortField,
            sortDirection,
            base_id
        } = req.query;

        // Determine which base to query
        let queryBase;
        if (req.user.role === 'admin') {
            // For admin, use the base_id from query if provided, otherwise show all bases
            queryBase = base_id || { $exists: true };
        } else {
            // For non-admin users, only show data from their assigned base
            if (!baseId) return res.status(400).json({ message: 'User base ID not found' });
            queryBase = baseId;
        }

        // Build the query object
        const query = { base: queryBase };

        let matchingAssetIds = [];

        if (asset) {
            const regex = new RegExp(asset, 'i');
            matchingAssetIds = await Asset.find({
                $or: [
                    { name: regex },
                    { category: regex },
                    { unit: regex }
                ]
            }).distinct('_id');
        }

        if (category && category !== 'All categories') {
            const catRegex = new RegExp(category, 'i');
            const categoryAssetIds = await Asset.find({ category: catRegex }).distinct('_id');

            // If asset is already filtered, take intersection
            if (matchingAssetIds.length > 0) {
                matchingAssetIds = matchingAssetIds.filter(id =>
                    categoryAssetIds.includes(id.toString())
                );
            } else {
                matchingAssetIds = categoryAssetIds;
            }

            // If still nothing matches after both filters
            if (matchingAssetIds.length === 0) {
                return res.status(200).json({ base: null, stocks: [] });
            }
        }

        // Finally apply the asset condition to the query
        if (matchingAssetIds.length > 0) {
            query.asset = { $in: matchingAssetIds };
        }

        const quantityQuery = {};
        if (minQuantity) quantityQuery.$gte = Number(minQuantity);
        if (maxQuantity) quantityQuery.$lte = Number(maxQuantity);
        if (showLowStock === 'true') quantityQuery.$lt = 10;
        if (Object.keys(quantityQuery).length > 0) {
            query.quantity = quantityQuery;
        }

        // const dateQuery = {};
        // if (dateFrom) dateQuery.$gte = new Date(dateFrom);
        // if (dateTo) dateQuery.$lte = new Date(dateTo);
        // if (Object.keys(dateQuery).length > 0) {
        //     query.updatedAt = dateQuery;
        // }

        if (dateFrom && dateTo) {
            const startDate = new Date(dateFrom);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            query.updatedAt = { $gte: startDate, $lte: endDate };
        }

        // Sorting logic remains the same...
        const sortOptions = {};
        if (sortField) {
            sortOptions[sortField] = sortDirection === 'desc' ? -1 : 1;
        } else {
            sortOptions.updatedAt = -1;
        }

        console.log("Query", query);
        console.log("Sort Options", sortOptions);

        const stocks = await Inventory.find(query)
            .populate('asset', 'name category unit')
            .populate('base', 'name state district')
            .sort(sortOptions);

        // Response formatting remains the same...
        if (!stocks.length) {
            return res.status(200).json({ base: null, stocks: [] });
        }

        const base = {
            name: stocks[0].base.name,
            state: stocks[0].base.state,
            district: stocks[0].base.district,
        };

        const formattedStocks = stocks.map(stock => ({
            _id: stock._id,
            asset: stock.asset,
            quantity: stock.quantity,
            purchased: stock.purchased,
            expended: stock.expended,
            assigned: stock.assigned,
            transferredOut: stock.transferredOut,
            transferredIn: stock.transferredIn,
            createdAt: stock.createdAt,
            updatedAt: stock.updatedAt
        }));

        res.status(200).json({ base, stocks: formattedStocks });
    } catch (error) {
        console.error('Error fetching stock details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * GET /api/inventory
 * Get all inventory with optional base and assetType filters
 */
export const getAllStockDetails = async (req, res) => {
    try {
        const { base, assetType } = req.query;

        // Build query dynamically
        const query = {};
        if (base) query.base = base;
        if (assetType) {
            const assetIds = await Asset.find({ category: assetType }).select('_id');
            query.asset = { $in: assetIds };
        }

        const stock = await Inventory.find(query)
            .populate('asset', 'name category unit')
            .populate('base', 'name state district');

        res.status(200).json(stock);
    } catch (error) {
        console.error('Error fetching all stock details:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

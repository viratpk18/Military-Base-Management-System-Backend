import { generateDailySummaries } from '../cron/dailySummaryJob.js';
import { DailyAssetSummary } from "../DB/models/DailyAssetSummary.model.js";
import Asset from '../DB/models/asset.model.js';
import Base from '../DB/models/base.model.js';

export const handler = async (req, res) => {
    try {
        await generateDailySummaries();
        return res.status(200).json({ message: "Summary job completed" });
    } catch (err) {
        console.error("Cron error:", err);
        return res.status(500).json({ error: "Failed to run summary" });
    }
}

export const getAssetSummaries = async (req, res) => {
    try {
        const {
            asset,
            category,
            minQuantity,
            maxQuantity,
            showLowStock,
            // dateFrom,
            // dateTo,
            date,
            sortField,
            sortDirection,
            base_id
        } = req.query;

        const queryBase = req.user.role !== 'admin' ? req.user.baseId : base_id;

        if (!queryBase) {
            return res.status(400).json({ message: 'Base ID is required for fetching assignments' });
        }
        const query = { base: queryBase };

        // Asset filtering
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

            if (matchingAssetIds.length > 0) {
                matchingAssetIds = matchingAssetIds.filter(id =>
                    categoryAssetIds.includes(id.toString())
                );
            } else {
                matchingAssetIds = categoryAssetIds;
            }

            if (matchingAssetIds.length === 0) {
                return res.status(200).json({ base: null, summaries: [] });
            }
        }

        if (matchingAssetIds.length > 0) {
            query.asset = { $in: matchingAssetIds };
        }

        // Quantity filter (on closing balance)
        const qtyQuery = {};
        if (minQuantity) qtyQuery.$gte = Number(minQuantity);
        if (maxQuantity) qtyQuery.$lte = Number(maxQuantity);
        if (showLowStock === 'true') qtyQuery.$lt = 10;

        if (Object.keys(qtyQuery).length > 0) {
            query.closingBalance = qtyQuery;
        }

        // Date filters
        // const dateQuery = {};
        // if (dateFrom) dateQuery.$gte = new Date(dateFrom);
        // if (dateTo) dateQuery.$lte = new Date(dateTo);
        // if (Object.keys(dateQuery).length > 0) {
        //     query.date = dateQuery;
        // }

        // Date filter - single specific date only
        if (date) {
            const inputDate = new Date(date);

            if (isNaN(inputDate)) {
                return res.status(400).json({ message: 'Invalid date format' });
            }

            // Match documents on the same calendar date regardless of time
            const startOfDay = new Date(inputDate.setHours(0, 0, 0, 0));
            const endOfDay = new Date(inputDate.setHours(23, 59, 59, 999));

            query.date = { $gte: startOfDay, $lte: endOfDay };
        }


        // Sorting
        const sortOptions = {};
        if (sortField) {
            sortOptions[sortField] = sortDirection === 'desc' ? -1 : 1;
        } else {
            sortOptions.date = -1;
        }

        const summaries = await DailyAssetSummary.find(query)
            .populate('asset', 'name category unit')
            .populate('base', 'name state district')
            .sort(sortOptions);

        if (!summaries.length) {
            return res.status(200).json({ base: null, summaries: [] });
        }

        const base = {
            name: summaries[0].base.name,
            state: summaries[0].base.state,
            district: summaries[0].base.district
        };

        const formattedSummaries = summaries.map(summary => ({
            _id: summary._id,
            date: summary.date,
            asset: summary.asset,
            base: summary.base,
            openingBalance: summary.openingBalance,
            purchases: summary.purchases,
            transfersIn: summary.transfersIn,
            transfersOut: summary.transfersOut,
            assigned: summary.assigned,
            expended: summary.expended,
            closingBalance: summary.closingBalance,
            netMovements: summary.purchases + summary.transfersIn - summary.transfersOut
        }));

        res.status(200).json({ base, summaries: formattedSummaries });
    } catch (error) {
        console.error('Error fetching asset summaries:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

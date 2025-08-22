// cron/dailySummaryJob.js
import { DailyAssetSummary } from '../DB/models/DailyAssetSummary.model.js';
import Inventory from '../DB/models/inventory.model.js';
import Base from '../DB/models/base.model.js';
import Asset from '../DB/models/asset.model.js';
import Purchase from '../DB/models/purchase.model.js';
import Transfer from '../DB/models/transfer.model.js';
import Assign from '../DB/models/assign.model.js';
import Expend from '../DB/models/expend.model.js';
import dayjs from 'dayjs';

export const generateDailySummaries = async () => {
    const date = dayjs().startOf('day').toDate();
    const nextDate = dayjs(date).add(1, 'day').toDate();

    const inventories = await Inventory.find().populate('base').populate('asset');

    for (const inv of inventories) {
        const baseId = inv.base._id;
        const assetId = inv.asset._id;

        const prevSummary = await DailyAssetSummary.findOne({
            date: dayjs(date).subtract(1, 'day').toDate(),
            base: baseId,
            asset: assetId,
        });

        const openingBalance = prevSummary ? prevSummary.closingBalance : 0;

        const [purchasesAgg, transfersInAgg, transfersOutAgg, assignmentsAgg, expendituresAgg] = await Promise.all([
            Purchase.aggregate([
                { $match: { base: baseId, purchaseDate: { $gte: date, $lt: nextDate } } },
                { $unwind: '$items' },
                { $match: { 'items.asset': assetId } },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ]),
            Transfer.aggregate([
                { $match: { toBase: baseId, transferDate: { $gte: date, $lt: nextDate } } },
                { $unwind: '$items' },
                { $match: { 'items.asset': assetId } },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ]),
            Transfer.aggregate([
                { $match: { fromBase: baseId, transferDate: { $gte: date, $lt: nextDate } } },
                { $unwind: '$items' },
                { $match: { 'items.asset': assetId } },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ]),
            Assign.aggregate([
                { $match: { base: baseId, assignDate: { $gte: date, $lt: nextDate } } },
                { $unwind: '$items' },
                { $match: { 'items.asset': assetId, isExpended: false } },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ]),
            Expend.aggregate([
                { $match: { base: baseId, expendDate: { $gte: date, $lt: nextDate } } },
                { $unwind: '$items' },
                { $match: { 'items.asset': assetId } },
                { $group: { _id: null, total: { $sum: '$items.quantity' } } }
            ])
        ]);

        const purchases = purchasesAgg[0]?.total || 0;
        const transfersIn = transfersInAgg[0]?.total || 0;
        const transfersOut = transfersOutAgg[0]?.total || 0;
        const assigned = assignmentsAgg[0]?.total || 0;
        const expended = expendituresAgg[0]?.total || 0;

        const closingBalance =
            openingBalance + purchases + transfersIn - transfersOut - assigned - expended;

        await DailyAssetSummary.findOneAndUpdate(
            { date, base: baseId, asset: assetId },
            {
                $set: {
                    openingBalance,
                    purchases,
                    transfersIn,
                    transfersOut,
                    assigned,
                    expended,
                    closingBalance,
                },
            },
            { upsert: true }
        );
    }

    console.log(`[✅] Daily summary updated for ${date.toDateString()}`);
};

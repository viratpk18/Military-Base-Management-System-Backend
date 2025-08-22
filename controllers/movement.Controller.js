import MovementLog from '../DB/models/movement.model.js';

/**
 * Create a new movement log with multiple items
 */
export const createLog = async ({
  actionType,
  items,
  base,
  performedBy,
  referenceId,
  remarks
}) => {
  try {
    const log = new MovementLog({
      actionType,
      items,
      base,
      performedBy,
      referenceId,
      remarks
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to create movement log:', error.message);
    // Log and continue, but don’t throw to avoid breaking core functionality
  }
};


/**
 * Fetch all movement logs (filtered, paginated)
 */
export const getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, baseId, assetId, actionType,  dateFrom, dateTo } = req.query;

    const query = {};
    if (req.user.role !== 'admin') {
      query.base = req.user.baseId;
    } else if (baseId) {
      query.base = baseId;
    }
    // Asset filtering
    if (assetId) {
      query['items.asset'] = assetId;
    }

    // Date filtering
    if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (actionType) query.actionType = actionType;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'base' },
        { path: 'performedBy' },
        { path: 'items.asset' } // ✅ nested path population
      ],
      sort: { createdAt: -1 }
    };

    const result = await MovementLog.paginate(query, options);

    res.status(200).json({
      logs: result.docs,
      total: result.totalDocs,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs', error: error.message });
  }
};

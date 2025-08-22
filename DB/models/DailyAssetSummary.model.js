// models/DailyAssetSummary.js
import mongoose from 'mongoose';

const dailyAssetSummarySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  base: { type: mongoose.Schema.Types.ObjectId, ref: 'Base', required: true },
  asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  
  openingBalance: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  transfersIn: { type: Number, default: 0 },
  transfersOut: { type: Number, default: 0 },
  assigned: { type: Number, default: 0 },
  expended: { type: Number, default: 0 },
  closingBalance: { type: Number, default: 0 },
});

dailyAssetSummarySchema.index({ date: 1, base: 1, asset: 1 }, { unique: true });

export const DailyAssetSummary = mongoose.model('DailyAssetSummary', dailyAssetSummarySchema);

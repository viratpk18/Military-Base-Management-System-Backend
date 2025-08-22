// models/asset.model.js
import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Asset name is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['weapon', 'vehicle', 'ammunition', 'equipment'],
    required: [true, 'Asset category is required']
  },
  unit: {
    type: String,
    required: [true, 'Unit of measurement is required'],
    trim: true,
    default: 'pcs' // e.g., pcs, kg, liters
  },
  description: {
    type: String,
    trim: true
  },
}, {
  timestamps: true
});

const Asset = mongoose.model('Asset', assetSchema);
export default Asset;

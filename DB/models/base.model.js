// models/base.model.js
import mongoose from 'mongoose';

const baseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Base name is required'],
    unique: true,
    trim: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true
  },
  district: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true
});

const Base = mongoose.model('Base', baseSchema);
export default Base;

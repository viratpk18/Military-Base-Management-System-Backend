// models/transfer.model.js
import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const transferItemSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  }
}, { _id: false });

const transferSchema = new mongoose.Schema({
  fromBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: [true, 'Source base is required']
  },
  toBase: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: [true, 'Destination base is required']
  },
  items: {
    type: [transferItemSchema],
    validate: [arr => arr.length > 0, 'At least one asset must be transferred']
  },
  transferredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Optional: who performed the transfer
  },
  transferDate: {
    type: Date,
    default: Date.now
  },
  invoiceNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add pagination plugin
transferSchema.plugin(mongoosePaginate);

const Transfer = mongoose.model('Transfer', transferSchema);
export default Transfer;

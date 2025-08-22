import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const logItemSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unitPrice: Number // Optional: only for purchase-related logs
}, { _id: false });

const movementLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    enum: ['purchase', 'transfer', 'assignment', 'expenditure'],
    required: true
  },
  items: {
    type: [logItemSchema],
    validate: [arr => arr.length > 0, 'At least one asset must be purchased']
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: true
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  remarks: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


movementLogSchema.plugin(mongoosePaginate);

const MovementLog = mongoose.model('MovementLog', movementLogSchema);
export default MovementLog;
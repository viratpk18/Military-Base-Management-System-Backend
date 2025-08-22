import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const expendedItemSchema = new mongoose.Schema({
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

const expendSchema = new mongoose.Schema({
  expendedBy: {
    type: String, // Can be Personnel ID or Role (e.g., field unit name)
    required: [true, 'ExpendedBy (Personnel Name or Unit) is required'],
    trim: true
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: [true, 'Base is required']
  },
  items: {
    type: [expendedItemSchema],
    validate: [arr => arr.length > 0, 'At least one asset must be expended']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Optional: who approved the expenditure
  },
  expendDate: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Add pagination plugin
expendSchema.plugin(mongoosePaginate);

const Expend = mongoose.model('Expend', expendSchema);
export default Expend;

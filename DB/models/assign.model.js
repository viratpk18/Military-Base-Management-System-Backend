import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const assignedItemSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  isExpended: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const assignSchema = new mongoose.Schema({
  assignedTo: {
    type: String,
    required: [true, 'AssignedTo (Personnel Name or ID) is required'],
    trim: true
  },
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: [true, 'Base is required']
  },
  items: {
    type: [assignedItemSchema],
    validate: [arr => arr.length > 0, 'At least one asset must be assigned']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // The person performing the assignment
  },
  assignDate: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    trim: true
  },
  isExpended: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add pagination plugin
assignSchema.plugin(mongoosePaginate);

const Assign = mongoose.model('Assign', assignSchema);
export default Assign;

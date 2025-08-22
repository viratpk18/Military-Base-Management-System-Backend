// models/purchase.model.js
import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const purchaseItemSchema = new mongoose.Schema({
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
  unitPrice: {
    type: Number,
    min: 0,
    default: 0
  }
}, { _id: false }); // We don't need individual _id for subdocs unless necessary

const purchaseSchema = new mongoose.Schema({
  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: [true, 'Base is required']
  },
  items: {
    type: [purchaseItemSchema],
    validate: [arr => arr.length > 0, 'At least one asset must be purchased']
  },
  purchasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // optional: if you track users
  },
  invoiceNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // allow multiple nulls
  },
  purchaseDate: {
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

// Add the pagination plugin
purchaseSchema.plugin(mongoosePaginate);

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;

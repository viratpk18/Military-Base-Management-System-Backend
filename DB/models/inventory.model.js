// models/inventory.model.js
import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: [true, 'Asset reference is required']
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: [true, 'Base reference is required']
    },

    // Total Quantity Available (i.e., quantity)
    // quantity = purchased - expended - assigned
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative']
    },
    purchased: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    expended: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    assigned: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    transferredOut: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    transferredIn: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    }
}, {
    timestamps: true
});

inventorySchema.index({ asset: 1, base: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;

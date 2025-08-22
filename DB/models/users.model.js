import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  role: {
    type: String,
    enum: ['admin', 'base_commander', 'logistics_officer', 'user'],
    default: 'user',
    required: true,
  },

  base: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Base',
    required: function () {
      return this.role === 'base_commander' || this.role === 'logistics_officer';
    },
  },

  // accessScope: {
  //   type: [String], // ['purchases', 'transfers']
  //   default: undefined,
  // },

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);
export default User;

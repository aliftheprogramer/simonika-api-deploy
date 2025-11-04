// @/models/Pool.js
import mongoose from 'mongoose';

const poolSchema = new mongoose.Schema(
  {
    namaKolam: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    // Reference to the assigned device (if any)
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
      index: true,
    },
    // Flag to indicate whether the pool is active/integrated with a device
    activeKolam: {
      type: Boolean,
      default: false,
    },
    kedalamanTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    levelMinimum: {
      type: Number,
      required: true,
      min: 0,
    },
    levelMaksimum: {
      type: Number,
      required: true,
      min: 0,
    },
    targetLevelNormal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure targetLevelNormal stays within min/max and keep activeKolam
// in sync with the presence of an assigned device.
poolSchema.pre('save', function (next) {
  if (this.targetLevelNormal < this.levelMinimum || this.targetLevelNormal > this.levelMaksimum) {
    return next(new Error('targetLevelNormal harus berada di antara levelMinimum dan levelMaksimum'));
  }
  // Derive active state from whether a device is linked
  this.activeKolam = !!this.device;
  next();
});

const Pool = mongoose.models.Pool || mongoose.model('Pool', poolSchema);
export default Pool;

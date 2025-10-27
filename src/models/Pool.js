// @/moodels/Pool.js
import mongoose from 'mongoose';

const poolSchema = new mongoose.Schema(
  {
    namaKolam: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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

poolSchema.pre('save', function (next) {
  if (this.targetLevelNormal < this.levelMinimum || this.targetLevelNormal > this.levelMaksimum) {
    return next(new Error('targetLevelNormal harus berada di antara levelMinimum dan levelMaksimum'));
  }
  next();
});

const Pool = mongoose.models.Pool || mongoose.model('Pool', poolSchema);
export default Pool;

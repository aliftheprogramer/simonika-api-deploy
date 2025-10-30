// src/models/Device.js
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, trim: true },
    secretHash: { type: String, required: true, select: false },
    pool: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', default: null },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    lastSeen: { type: Date },
    metadata: { type: Object },
  },
  { timestamps: true }
);

// Instance method to compare a plain token with the stored hash
deviceSchema.methods.verifyToken = async function (token) {
  if (!this.secretHash) return false;
  return bcrypt.compare(token, this.secretHash);
};

// Static helper to hash token
deviceSchema.statics.hashToken = async function (token) {
  const saltRounds = 10;
  return bcrypt.hash(token, saltRounds);
};

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);
export default Device;

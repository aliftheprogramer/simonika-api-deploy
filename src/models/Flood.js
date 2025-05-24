// src/models/Flood.js
import mongoose from "mongoose";

const FloodSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
    },
    waterLevel: {
      type: Number,
      required: true,
    },
    temperature: {
      type: Number,
    },
    humidity: {
      type: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
    },
    status: {
      type: String,
      enum: ["normal", "alert", "critical"],
      default: "normal",
    },
  },
  {
    collection: "flood_data",
    timestamps: true,
  }
);

export default mongoose.models.Flood || mongoose.model("Flood", FloodSchema);

const mongoose = require("mongoose");

const poleReadingHistorySchema = new mongoose.Schema({
  pole_id: {
    type: String,
    required: true,
    index: true   // 🔥 important for fast queries
  },

  current: {
    type: Number,
    required: true
  },

  voltage: {
    type: Number,
    required: true
  },

  power: {
    type: Number,
    required: true
  },

  time_stamp: {
    type: Date,
    default: Date.now,
    index: true   // 🔥 important for time-based queries
  }

}, {
  versionKey: false
});


// 🚀 Compound Index (VERY IMPORTANT)
poleReadingHistorySchema.index({ pole_id: 1, time_stamp: -1 });


// Optional: Auto-delete old data (TTL index)
// poleReadingHistorySchema.index(
//   { time_stamp: 1 },
//   { expireAfterSeconds: 60 * 60 * 24 * 7 } // 7 days
// );


module.exports = mongoose.model(
  "PoleReadingHistory",
  poleReadingHistorySchema
);
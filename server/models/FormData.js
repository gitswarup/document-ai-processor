const mongoose = require('mongoose');

const formDataSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  keyValuePairs: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    default: {}
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extractedText: {
    type: String,
    default: ''
  },
  processingMethod: {
    type: String,
    enum: ['tesseract', 'google', 'claude', 'mock'],
    default: 'tesseract'
  },
  metadata: {
    fileSize: Number,
    mimeType: String,
    processingTime: Number,
    extractedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  strict: false
});

formDataSchema.index({ filename: 1, createdAt: -1 });
formDataSchema.index({ originalFilename: 'text' });

module.exports = mongoose.model('FormData', formDataSchema);
const mongoose = require('mongoose');

const keyValueIndexSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FormData',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  keyNormalized: {
    type: String,
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
    default: 'string'
  },
  extractedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Essential indices only - based on actual API query patterns

// 1. Primary key search patterns (covers exact key search API)
keyValueIndexSchema.index({ key: 1, extractedAt: -1 });

// 2. Partial key search (covers keyNormalized search API) 
keyValueIndexSchema.index({ keyNormalized: 1 });

// 3. Document cleanup (covers deletion when document is removed)
keyValueIndexSchema.index({ documentId: 1 });

module.exports = mongoose.model('KeyValueIndex', keyValueIndexSchema);
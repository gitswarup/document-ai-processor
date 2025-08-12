const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [{
    id: String,
    type: {
      type: String,
      enum: ['user', 'ai'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      query: mongoose.Schema.Types.Mixed,
      matchedDocuments: [String],
      searchResults: mongoose.Schema.Types.Mixed,
      confidence: Number,
      processingTime: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

chatHistorySchema.index({ createdAt: -1 });
chatHistorySchema.index({ 'messages.timestamp': -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
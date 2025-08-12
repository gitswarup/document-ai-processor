const aiService = require('./aiService');
const FormData = require('../models/FormData');

class ChatService {
  
  // Main chat processing function using AI
  static async processQuery(query) {
    const startTime = Date.now();
    
    try {
      console.log('Processing chat query with AI:', query);
      
      // Get all documents with their key-value pairs
      const documents = await FormData.find()
        .select('_id originalFilename keyValuePairs extractedText confidence processingMethod createdAt')
        .sort({ createdAt: -1 })
        .limit(20) // Limit to prevent too much data for LLM
        .lean();

      if (documents.length === 0) {
        return {
          content: "You haven't uploaded any documents yet. Please upload some documents first to ask questions about them.",
          confidence: 0.9,
          type: 'no_documents'
        };
      }

      console.log(`Found ${documents.length} documents for AI context`);
      
      // Prepare document data for AI
      const documentData = documents.map(doc => ({
        filename: doc.originalFilename,
        keyValuePairs: doc.keyValuePairs || [],
        extractedText: doc.extractedText ? doc.extractedText.substring(0, 1000) : null, // Limit text to prevent token overflow
        confidence: doc.confidence,
        processingMethod: doc.processingMethod,
        createdAt: doc.createdAt
      }));

      // Use AI service to generate response
      const aiResponse = await aiService.chatQuery(query, documentData);
      
      return {
        content: aiResponse,
        confidence: 0.9,
        type: 'ai_response',
        metadata: {
          documentsUsed: documents.length,
          aiProvider: aiService.getSelectedProvider(),
          processingTime: Date.now() - startTime
        }
      };
      
    } catch (error) {
      console.error('Chat processing error:', error);
      
      // Fallback response for AI failures
      return {
        content: 'I encountered an error while processing your request. Please try rephrasing your question or check if your documents contain the information you\'re looking for.',
        confidence: 0.1,
        type: 'error',
        error: error.message
      };
    }
  }

  // Helper method to get document statistics for debugging
  static async getDocumentStats() {
    try {
      const totalDocs = await FormData.countDocuments();
      const recentDocs = await FormData.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      });
      
      return {
        totalDocuments: totalDocs,
        recentDocuments: recentDocs
      };
    } catch (error) {
      console.error('Error getting document stats:', error);
      return { totalDocuments: 0, recentDocuments: 0 };
    }
  }
}

module.exports = ChatService;
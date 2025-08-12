const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { connectDatabase } = require('./services/database');
const FormData = require('./models/FormData');
const ChatHistory = require('./models/ChatHistory');
const KeyValueIndexService = require('./services/keyValueIndexService');
const ChatService = require('./services/chatService');
const documentProcessor = require('./services/documentProcessor');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'));
    }
  }
});

app.post('/api/process-document', upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    
    const extractedText = await documentProcessor.extractText(req.file.path, req.file.mimetype);
    
    if (!extractedText.trim()) {
      return res.status(400).json({ 
        error: 'No text content found in the document',
        keyValuePairs: []
      });
    }

    const keyValuePairs = await aiService.extractKeyValuePairs(extractedText);
    const processingTime = Date.now() - startTime;
    
    // Save to database
    const formData = new FormData({
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      keyValuePairs: keyValuePairs,
      confidence: 0.85,
      extractedText: extractedText,
      processingMethod: process.env.AI_PROVIDER || 'tesseract',
      metadata: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        processingTime: processingTime,
        extractedAt: new Date()
      }
    });

    await formData.save();
    console.log(`Saved form data to database with ID: ${formData._id}`);
    
    // Index key-value pairs for fast searching
    await KeyValueIndexService.indexKeyValuePairs(
      formData._id,
      formData.filename,
      formData.originalFilename,
      keyValuePairs,
      formData.metadata.extractedAt
    );
    
    // Clean up file
    fs.unlinkSync(req.file.path);
    
    res.json({
      id: formData._id,
      keyValuePairs,
      confidence: 0.85,
      originalFilename: req.file.originalname,
      processingTime: processingTime
    });

  } catch (error) {
    console.error('Error processing document:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    // Provide detailed error messages in development mode
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = {
      error: 'Failed to process document. Please try again.',
      keyValuePairs: []
    };
    
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        filename: req.file ? req.file.originalname : 'unknown',
        mimeType: req.file ? req.file.mimetype : 'unknown',
        fileSize: req.file ? req.file.size : 0,
        timestamp: new Date().toISOString(),
        processingStep: error.processingStep || 'unknown'
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Get all processed documents
app.get('/api/documents', async (req, res) => {
  try {
    const documents = await FormData.find()
      .select('_id originalFilename keyValuePairs confidence processingMethod createdAt metadata.fileSize')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to fetch documents' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Get specific document by ID
app.get('/api/documents/:id', async (req, res) => {
  try {
    const document = await FormData.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(document);
  } catch (error) {
    console.error('Error fetching document:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to fetch document' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        documentId: req.params.id,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Search documents by filename
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const documents = await FormData.find({
      $or: [
        { originalFilename: { $regex: q, $options: 'i' } },
        { filename: { $regex: q, $options: 'i' } }
      ]
    })
    .select('_id originalFilename keyValuePairs confidence processingMethod createdAt')
    .sort({ createdAt: -1 });
    
    res.json({
      documents,
      count: documents.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to search documents' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        searchQuery: req.query.q,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Search for a specific key across all documents (OPTIMIZED)
app.get('/api/search/key/:keyName', async (req, res) => {
  try {
    const { keyName } = req.params;
    const { exact, limit } = req.query;
    
    if (!keyName) {
      return res.status(400).json({ error: 'Key name is required' });
    }

    const searchLimit = parseInt(limit) || 100;
    let results;

    if (exact === 'true') {
      // Use indexed exact key search
      results = await KeyValueIndexService.searchByKeyExact(keyName, searchLimit);
    } else {
      // Use indexed partial key search
      results = await KeyValueIndexService.searchByKeyPartial(keyName, searchLimit);
    }

    res.json(results);

  } catch (error) {
    console.error('Error searching for key:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to search for key' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        keyName: req.params.keyName,
        exact: req.query.exact,
        limit: req.query.limit,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Get key statistics
app.get('/api/keys/stats', async (req, res) => {
  try {
    const stats = await KeyValueIndexService.getKeyStatistics();
    res.json({
      keyStatistics: stats,
      totalKeys: stats.length
    });
  } catch (error) {
    console.error('Error fetching key statistics:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to fetch key statistics' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Delete a document and its index entries
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const documentId = req.params.id;
    
    // Delete the main document
    const deletedDoc = await FormData.findByIdAndDelete(documentId);
    if (!deletedDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Remove index entries
    const removedIndexCount = await KeyValueIndexService.removeDocumentIndex(documentId);
    
    res.json({
      message: 'Document deleted successfully',
      documentId: documentId,
      removedIndexEntries: removedIndexCount
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
    
    const errorResponse = { error: 'Failed to delete document' };
    if (isDev) {
      errorResponse.details = {
        message: error.message,
        stack: error.stack,
        documentId: req.params.id,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(500).json(errorResponse);
  }
});

// Chat API endpoints
app.post('/api/chat/query', async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    
    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Process the query using ChatService
    const response = await ChatService.processQuery(query.trim());
    
    // Generate session ID if not provided
    const chatSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Create user message
    const userMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: query,
      timestamp: new Date()
    };
    
    // Create AI response message
    const aiMessage = {
      id: `msg_${Date.now()}_ai`,
      type: 'ai',
      content: response.content,
      timestamp: new Date(),
      metadata: {
        query: response.metadata?.query,
        confidence: response.confidence,
        processingTime: response.metadata?.totalProcessingTime,
        responseType: response.type,
        matchedDocuments: response.metadata?.searchResults?.totalMatches || 0
      }
    };
    
    // Save to chat history
    await ChatHistory.findOneAndUpdate(
      { sessionId: chatSessionId },
      { 
        $push: { messages: { $each: [userMessage, aiMessage] } },
        $set: { updatedAt: new Date() }
      },
      { upsert: true, new: true }
    );
    
    res.json({
      response: aiMessage,
      sessionId: chatSessionId,
      metadata: {
        confidence: response.confidence,
        type: response.type,
        processingTime: response.metadata?.totalProcessingTime
      }
    });
    
  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat query',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    
    const chatHistory = await ChatHistory.findOne({ sessionId });
    
    if (!chatHistory) {
      return res.json({ messages: [] });
    }
    
    const messages = chatHistory.messages
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .slice(-parseInt(limit));
    
    res.json({
      messages,
      sessionId,
      totalMessages: chatHistory.messages.length
    });
    
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

app.delete('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    await ChatHistory.deleteOne({ sessionId });
    
    res.json({ message: 'Chat history cleared successfully' });
    
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'document-ai-processor' });
});

// Initialize database connection and start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    app.listen(PORT, () => {
      console.log(`Document AI Processor server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Documents API: http://localhost:${PORT}/api/documents`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
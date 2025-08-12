# Technical Architecture Specification

## 🏗️ System Overview

The Document AI Processor is a full-stack web application designed to process documents (PDF, JPEG, JPG, PNG) using AI to extract key-value pairs and provide intelligent chat-based querying capabilities.

### Core Capabilities
- **Document Processing**: Multi-format document ingestion with OCR
- **AI-Powered Extraction**: Key-value pair extraction using multiple AI providers
- **Intelligent Search**: MongoDB-based indexing for fast data retrieval
- **Conversational Interface**: AI chatbot for natural language document queries
- **Web Interface**: Modern React-based user interface

## 🎯 Architecture Principles

### Design Patterns
- **Microservice Architecture**: Modular, loosely-coupled services
- **Provider Pattern**: Pluggable AI providers with fallback mechanisms
- **Repository Pattern**: Data access layer abstraction
- **Factory Pattern**: Dynamic AI provider instantiation
- **Observer Pattern**: Event-driven document processing

### Quality Attributes
- **Scalability**: Horizontal scaling with queue-based processing
- **Reliability**: Multi-provider fallback and error recovery
- **Maintainability**: Clean code architecture with separation of concerns
- **Security**: Defense in depth with multiple security layers
- **Performance**: Optimized database queries and caching strategies

## 🏛️ System Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (React)       │    │   (Node.js)     │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Document List │◄──►│ • REST API      │◄──►│ • Google AI     │
│ • Document View │    │ • File Upload   │    │ • Claude AI     │
│ • Chat Interface│    │ • AI Processing │    │ • MongoDB       │
│ • Navigation    │    │ • Chat Service  │    │ • Cloud Storage │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Component Architecture

### Backend Components

#### 1. API Layer (`server/index.js`)
- **Purpose**: HTTP request handling and routing
- **Responsibilities**:
  - File upload handling with Multer
  - Document CRUD operations
  - Chat API endpoints
  - Error handling and validation
- **Dependencies**: Express.js, Multer, CORS

#### 2. Document Processing Service (`server/services/documentProcessor.js`)
- **Purpose**: Extract text from various document formats
- **Responsibilities**:
  - PDF text extraction (pdf-parse)
  - Image OCR processing (Tesseract.js)
  - Text preprocessing and cleaning
  - Error handling with fallback strategies
- **Dependencies**: pdf-parse, Tesseract.js, Sharp

#### 3. AI Service Layer (`server/services/aiService.js`)
- **Purpose**: Manage multiple AI providers for text processing and chat
- **Responsibilities**:
  - Provider selection and initialization
  - Key-value pair extraction
  - Chat query processing
  - Provider fallback handling
- **Dependencies**: Dynamic provider imports

#### 4. AI Providers (`server/services/providers/`)
- **GoogleProvider**: Google Gemini AI integration
- **ClaudeProvider**: Anthropic Claude integration  
- **MockProvider**: Development fallback and testing

#### 5. Chat Service (`server/services/chatService.js`)
- **Purpose**: AI-powered conversational interface
- **Responsibilities**:
  - Query processing with document context
  - Response generation using AI providers
  - Chat history management
- **Dependencies**: AI Service, FormData model

#### 6. Key-Value Index Service (`server/services/keyValueIndexService.js`)
- **Purpose**: Optimize search performance for extracted data
- **Responsibilities**:
  - Index creation and management
  - Fast key/value searches
  - Statistics and analytics
- **Dependencies**: KeyValueIndex model

#### 7. Database Service (`server/services/database.js`)
- **Purpose**: Database connection and configuration management
- **Responsibilities**:
  - MongoDB connection handling
  - Connection pooling
  - Error recovery
- **Dependencies**: Mongoose

### Data Models

#### 1. FormData Model (`server/models/FormData.js`)
```javascript
{
  filename: String,
  originalFilename: String,
  keyValuePairs: [{ key: String, value: Mixed }],
  confidence: Number,
  extractedText: String,
  processingMethod: String,
  metadata: {
    fileSize: Number,
    mimeType: String,
    processingTime: Number,
    extractedAt: Date
  },
  createdAt: Date
}
```

#### 2. KeyValueIndex Model (`server/models/KeyValueIndex.js`)
```javascript
{
  documentId: ObjectId,
  filename: String,
  originalFilename: String,
  key: String,
  keyNormalized: String,
  value: Mixed,
  valueType: String,
  extractedAt: Date
}
```

#### 3. ChatHistory Model (`server/models/ChatHistory.js`)
```javascript
{
  sessionId: String,
  messages: [{
    id: String,
    type: ['user', 'ai'],
    content: String,
    timestamp: Date,
    metadata: {
      query: Mixed,
      confidence: Number,
      processingTime: Number
    }
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Frontend Architecture

#### 1. Component Structure
```
src/
├── components/
│   ├── FileUpload.js        # Drag-drop file upload
│   ├── ResultDisplay.js     # Processing results display
│   ├── Navigation.js        # App navigation bar
│   └── DocumentChat.js      # Chat interface component
├── pages/
│   ├── HomePage.js          # Landing page with upload
│   ├── DocumentsListPage.js # Document grid view
│   └── DocumentDetailPage.js# Individual document view
└── App.js                   # Main app with routing
```

#### 2. State Management
- **Local State**: React useState for component state
- **Routing State**: React Router for navigation
- **No Global State**: Simplified architecture with props passing

#### 3. API Integration
- **Fetch API**: For HTTP requests
- **Axios**: Alternative for complex requests
- **Error Handling**: User-friendly error messages

## 🗃️ Database Design

### MongoDB Collections

#### 1. formdata Collection
- **Purpose**: Store processed document metadata and results
- **Indexes**:
  - `{ createdAt: -1 }` - Chronological queries
  - `{ originalFilename: 1 }` - Filename searches
- **Size**: Variable (depends on document content)

#### 2. keyvalueindices Collection  
- **Purpose**: Fast searching of extracted key-value pairs
- **Indexes**:
  - `{ key: 1, extractedAt: -1 }` - Key searches
  - `{ keyNormalized: 1 }` - Normalized key searches  
  - `{ documentId: 1 }` - Document cleanup
- **Size**: Grows linearly with extracted fields

#### 3. chathistories Collection
- **Purpose**: Store chat sessions and conversation history
- **Indexes**:
  - `{ sessionId: 1 }` - Session retrieval
  - `{ createdAt: -1 }` - Chronological cleanup
- **Size**: Grows with user interactions

### Data Flow

```
Document Upload → Document Processing → AI Extraction → Database Storage → Indexing
       ↓                    ↓                ↓               ↓            ↓
   File Storage    →    Text/OCR     →   Key-Value    →   FormData   →  Search Index
                                         Pairs            Collection     Collection
```

## 🔌 API Specification

### Document Processing Endpoints

#### POST `/api/process-document`
- **Purpose**: Upload and process a new document
- **Input**: Multipart form data with document file
- **Output**: Processing results and extracted data
- **Error Handling**: Detailed error messages in development mode

#### GET `/api/documents`
- **Purpose**: Retrieve all processed documents
- **Output**: Paginated list of document metadata
- **Filtering**: Support for date ranges and search terms

#### GET `/api/documents/:id`
- **Purpose**: Get detailed information about a specific document
- **Output**: Complete document data with key-value pairs

#### DELETE `/api/documents/:id`
- **Purpose**: Delete a document and its associated data
- **Side Effects**: Cleanup from all related collections

### Chat Endpoints

#### POST `/api/chat/query`
- **Purpose**: Process a chat query using AI
- **Input**: `{ query: string, sessionId?: string }`
- **Output**: AI-generated response with metadata
- **Features**: Session management and context awareness

#### GET `/api/chat/history/:sessionId`
- **Purpose**: Retrieve chat history for a session
- **Output**: Chronological list of messages
- **Pagination**: Configurable limit parameter

### Search Endpoints

#### GET `/api/search`
- **Purpose**: General search across all documents
- **Parameters**: Query string, filters, pagination
- **Output**: Ranked search results

## 🔐 Security Architecture

### Current Security Measures
- **File Validation**: MIME type and extension checking
- **Input Sanitization**: Express validator middleware
- **Error Handling**: Secure error messages (no stack traces in production)
- **CORS**: Configured for specific origins

### Future Security Enhancements
- **Authentication**: JWT-based user authentication
- **Authorization**: Role-based access control
- **Encryption**: Document encryption at rest
- **Rate Limiting**: API request throttling
- **Security Headers**: Helmet.js implementation

## ⚡ Performance Architecture

### Current Optimizations
- **Database Indexes**: Optimized for common query patterns
- **Connection Pooling**: MongoDB connection efficiency
- **File Processing**: Streaming for large files
- **Caching**: In-memory caching for AI responses

### Scalability Strategies
- **Horizontal Scaling**: Load balancer ready architecture
- **Queue System**: Background processing for large documents
- **CDN Integration**: Static asset delivery optimization
- **Database Sharding**: Preparation for large-scale data

## 🚀 Deployment Architecture

### Current Development Setup
- **Frontend**: React development server (localhost:3000)
- **Backend**: Node.js server (localhost:8000)  
- **Database**: Local MongoDB instance
- **File Storage**: Local file system

### Production Architecture (Planned)
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Load        │    │ Application │    │ Database    │
│ Balancer    │    │ Servers     │    │ Cluster     │
├─────────────┤    ├─────────────┤    ├─────────────┤
│ • SSL/TLS   │◄──►│ • Node.js   │◄──►│ • MongoDB   │
│ • Caching   │    │ • React     │    │ • Redis     │
│ • Routing   │    │ • Queue     │    │ • Backup    │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 📊 Monitoring & Observability

### Logging Strategy
- **Application Logs**: Winston structured logging
- **Access Logs**: HTTP request/response logging
- **Error Logs**: Centralized error tracking
- **Audit Logs**: User action tracking

### Metrics Collection
- **Performance Metrics**: Response times, throughput
- **Business Metrics**: Document processing success rates
- **System Metrics**: CPU, memory, disk usage
- **AI Metrics**: Token usage, cost tracking

### Health Monitoring
- **Health Checks**: `/api/health` endpoint
- **Dependency Checks**: Database and AI service connectivity
- **Alerting**: Automated notifications for failures

## 🔄 Data Flow Diagrams

### Document Processing Flow
```
User Upload → Validation → Processing → AI Extraction → Storage → Indexing
     ↓            ↓           ↓            ↓           ↓        ↓
File Received → File Check → OCR/Parse → LLM Call → MongoDB → Search Index
```

### Chat Query Flow  
```
User Query → Context Fetch → AI Processing → Response → History Storage
     ↓            ↓             ↓            ↓           ↓
Chat Input → Document Data → LLM Request → AI Response → Session Update
```

## 🧪 Testing Architecture

### Current Testing
- **Manual Testing**: Development and user acceptance testing
- **Error Handling**: Comprehensive error scenarios
- **Integration**: API endpoint testing

### Planned Testing Strategy
- **Unit Tests**: Jest for individual components
- **Integration Tests**: API endpoint testing
- **End-to-End Tests**: Playwright for user workflows
- **Load Testing**: k6 for performance validation
- **Security Testing**: OWASP ZAP for vulnerability scanning

## 📋 Configuration Management

### Environment Variables
```
# AI Configuration
AI_PROVIDER=google|claude|mock
GOOGLE_API_KEY=<api-key>
CLAUDE_API_KEY=<api-key>

# Database
MONGODB_URI=mongodb://localhost:27017/form-autofill

# Server
PORT=8000
NODE_ENV=development|production

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

### Configuration Files
- **Package.json**: Dependencies and scripts
- **Environment Files**: `.env` for sensitive configuration
- **Docker Configuration**: Containerization settings

## 🔮 Future Architecture Considerations

### Microservices Migration
- **API Gateway**: Centralized request routing
- **Service Discovery**: Dynamic service registration
- **Message Queues**: Asynchronous service communication

### Advanced AI Features
- **Vector Databases**: Semantic search capabilities
- **Fine-tuned Models**: Custom AI model training
- **Multi-modal AI**: Image and text processing

### Enterprise Features
- **Multi-tenancy**: Organization-based data isolation
- **Advanced Analytics**: Business intelligence dashboards
- **Compliance Tools**: Automated compliance reporting

---

*Document Version: 1.0*  
*Last Updated: January 2025*  
*Architecture Review: Quarterly*
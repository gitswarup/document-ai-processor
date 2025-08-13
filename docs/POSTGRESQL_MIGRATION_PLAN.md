# PostgreSQL Migration Plan with Vertex AI Integration

## Context & Decision Background

### Current State
- **Database**: MongoDB with Mongoose ODM
- **Architecture**: Document-based storage for form processing
- **Models**: ChatHistory, FormData, KeyValueIndex
- **Environment**: Local development, planning GCP deployment
- **Use Case**: Document AI processing and RAG-based query system

### Migration Drivers
1. **GCP Integration**: Moving to Google Cloud Platform - PostgreSQL (Cloud SQL) is native
2. **Vector Search**: Need advanced semantic search for document RAG capabilities  
3. **Cost Optimization**: Vertex AI + Cloud SQL ~60% cheaper than current external APIs
4. **Scalability**: Better performance and scaling options than MongoDB Atlas
5. **Feature Enhancement**: Unlock 10+ new AI-powered document processing features

### Target Architecture
- **Database**: PostgreSQL with pgvector extension on GCP Cloud SQL
- **AI Services**: Vertex AI Document AI + Matching Engine
- **Storage**: Maintain JSONB flexibility while gaining SQL power
- **Vector Search**: Hybrid PostgreSQL + Vertex AI Matching Engine

---

## Current MongoDB Schema Analysis

### Existing Models
```javascript
// ChatHistory - Session-based chat with message arrays
{
  sessionId: String,
  messages: [{
    id: String,
    type: 'user'|'ai', 
    content: String,
    timestamp: Date,
    metadata: { query, matchedDocuments, searchResults, confidence, processingTime }
  }],
  createdAt: Date,
  updatedAt: Date
}

// FormData - Main document storage
{
  filename: String,
  originalFilename: String,
  keyValuePairs: Mixed,
  confidence: Number,
  extractedText: String,
  processingMethod: 'tesseract'|'google'|'claude'|'mock',
  metadata: { fileSize, mimeType, processingTime, extractedAt }
}

// KeyValueIndex - Searchable normalized index
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

### Current Dependencies
```json
{
  "mongoose": "^8.17.0",
  "express": "^4.18.2",
  "@google-cloud/vision": "^5.3.3",
  "@google/genai": "^1.12.0"
}
```

---

## Target PostgreSQL Schema

### Core Tables with Vector Extensions
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Chat History (maintains message structure)
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Form Data with vector embeddings
CREATE TABLE form_data (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    key_value_pairs JSONB NOT NULL DEFAULT '{}',
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0,
    extracted_text TEXT DEFAULT '',
    processing_method VARCHAR(50) DEFAULT 'tesseract',
    
    -- Vector embeddings for RAG search
    text_embedding vector(768),        -- Document content embeddings
    content_embedding vector(768),     -- Semantic content embeddings
    
    -- Document classification
    document_type VARCHAR(100),        -- Auto-detected type
    classification_confidence FLOAT,   -- Vertex AI classification confidence
    
    -- Enhanced metadata
    metadata JSONB DEFAULT '{}',
    vertex_ai_results JSONB,          -- Raw Vertex AI processing results
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Key-Value Index with semantic capabilities
CREATE TABLE key_value_index (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES form_data(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    key_normalized VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(50) DEFAULT 'string',
    
    -- Vector embeddings for semantic matching
    key_embedding vector(768),
    value_embedding vector(768),
    
    -- Vertex AI extracted entities
    extracted_entities JSONB,         -- People, dates, amounts, etc.
    entity_confidence FLOAT,
    
    extracted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Document chunks for advanced RAG
CREATE TABLE document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES form_data(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    chunk_embedding vector(768),
    overlap_text TEXT,                 -- For context preservation
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Indexes
```sql
-- Basic performance indexes
CREATE INDEX idx_chat_session ON chat_history(session_id);
CREATE INDEX idx_chat_created ON chat_history(created_at DESC);
CREATE INDEX idx_form_filename ON form_data(filename);
CREATE INDEX idx_form_type ON form_data(document_type);
CREATE INDEX idx_form_created ON form_data(created_at DESC);
CREATE INDEX idx_kv_document ON key_value_index(document_id);
CREATE INDEX idx_kv_key ON key_value_index(key);
CREATE INDEX idx_kv_normalized ON key_value_index(key_normalized);

-- Vector similarity indexes (ivfflat for performance)
CREATE INDEX idx_form_text_embedding ON form_data USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_form_content_embedding ON form_data USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_kv_key_embedding ON key_value_index USING ivfflat (key_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_kv_value_embedding ON key_value_index USING ivfflat (value_embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_chunk_embedding ON document_chunks USING ivfflat (chunk_embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search indexes
CREATE INDEX idx_form_extracted_text ON form_data USING gin(to_tsvector('english', extracted_text));
CREATE INDEX idx_kv_key_text ON key_value_index USING gin(to_tsvector('english', key));
CREATE INDEX idx_chunk_text ON document_chunks USING gin(to_tsvector('english', chunk_text));

-- JSONB indexes for key-value queries
CREATE INDEX idx_form_kv_pairs ON form_data USING gin(key_value_pairs);
CREATE INDEX idx_kv_entities ON key_value_index USING gin(extracted_entities);
```

---

## Migration Steps & Implementation Plan

### Phase 1: Database Migration (Week 1)
1. **Setup PostgreSQL Environment**
   - GCP Cloud SQL instance with pgvector
   - Connection configuration
   - Environment variable updates

2. **Schema Creation**
   - Execute DDL scripts
   - Create indexes
   - Set up constraints

3. **Dependency Updates**
   ```bash
   # Remove MongoDB dependencies
   npm uninstall mongoose
   
   # Add PostgreSQL dependencies
   npm install pg pg-hstore sequelize
   npm install @google-cloud/sql-connector
   npm install --save-dev @types/pg
   ```

4. **Data Migration Script**
   - Export existing MongoDB data
   - Transform to PostgreSQL format
   - Preserve relationships and timestamps

5. **Core Functionality Migration**
   - Replace Mongoose models with Sequelize
   - Update database connection logic
   - Migrate CRUD operations
   - Update API endpoints

### Phase 2: Vertex AI Integration (Week 2)
1. **Document AI Setup**
   ```bash
   npm install @google-cloud/documentai
   npm install @google-cloud/aiplatform
   ```

2. **Enhanced Document Processing**
   - Replace manual OCR with Document AI
   - Add automatic document classification
   - Implement entity extraction
   - Generate embeddings via Vertex AI

3. **Vector Search Enhancement**
   - Implement semantic similarity queries
   - Add hybrid text + vector search
   - Create document clustering capabilities

### Phase 3: Advanced Features (Week 3-4)
1. **New Capabilities Implementation**
   - Smart document discovery
   - Cross-document pattern detection
   - Intelligent form field suggestions
   - Real-time processing alerts

2. **Matching Engine Integration**
   - Setup Vertex AI Matching Engine
   - Migrate complex vector operations
   - Implement large-scale similarity search

---

## New Features Unlocked

### Day 1 Post-Migration
- ✅ All existing functionality preserved
- ✅ Better query performance
- ✅ Real-time updates via PostgreSQL triggers

### Week 1 Features
- 🚀 Document similarity search
- 🚀 Semantic chat queries  
- 🚀 Auto document classification
- 🚀 Entity extraction and linking

### Month 1 Advanced Features
- ⚡ Cross-document relationship mapping
- ⚡ Anomaly detection in document patterns
- ⚡ Predictive form field completion
- ⚡ Bulk document comparison tools
- ⚡ Advanced analytics dashboard

---

## Cost & Performance Benefits

### Cost Optimization
- **Vertex AI Embeddings**: $0.025/1M tokens (vs OpenAI $0.13/1M = 80% savings)
- **Document AI**: $15/1K pages (vs GPT-4 API ~60% savings)  
- **Cloud SQL**: Starting $7/month (vs Atlas M10 $57/month)

### Performance Gains
- **Query Speed**: 3-5x faster for complex searches
- **Vector Operations**: Native pgvector vs application-level processing
- **Concurrent Users**: Better connection pooling and scaling
- **Real-time Updates**: PostgreSQL triggers vs polling

### Development Efficiency
- **40% Less Code**: Vertex AI handles complex AI operations
- **Built-in Scaling**: GCP manages infrastructure
- **Unified Ecosystem**: Single cloud provider benefits

---

## Risk Mitigation & Rollback Plan

### Migration Risks
1. **Data Loss**: Complete MongoDB backup before migration
2. **Downtime**: Implement blue-green deployment
3. **Performance Regression**: Load testing with realistic data
4. **Feature Parity**: Comprehensive integration testing

### Rollback Strategy
- Keep MongoDB instance running during initial weeks
- Dual-write capability during transition period
- Feature flags for gradual migration
- Monitoring and alerting for performance metrics

---

## Environment Configuration

### Local Development Setup
```bash
# Docker Compose for local PostgreSQL with pgvector
docker run --name postgres-vector \
  -e POSTGRES_DB=form_autofill \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d pgvector/pgvector:pg16
```

### GCP Cloud SQL Configuration
```bash
# Cloud SQL instance creation
gcloud sql instances create form-autofill-postgres \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=20GB
```

### Environment Variables
```env
# Replace MongoDB URI
# MONGODB_URI=mongodb://localhost:27017/form-autofill

# New PostgreSQL connection
DATABASE_URL=postgresql://username:password@localhost:5432/form_autofill
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1
DOCUMENT_AI_PROCESSOR_ID=your-processor-id
```

---

## Success Criteria

### Technical Metrics
- [ ] 100% API functionality preserved
- [ ] <100ms average query response time
- [ ] Support for 10+ concurrent users
- [ ] 99.9% data migration accuracy

### Feature Metrics  
- [ ] Document similarity search functional
- [ ] Auto-classification >90% accuracy
- [ ] Vector search results relevant
- [ ] Real-time updates working

### Business Metrics
- [ ] 60%+ cost reduction achieved
- [ ] 5+ new features deployed
- [ ] Zero data loss during migration
- [ ] <4 hours total downtime

---

## Next Steps

1. **Review and Approve Plan** - Validate approach and timeline
2. **Environment Setup** - Create GCP Cloud SQL instance  
3. **Code Migration** - Execute Phase 1 implementation
4. **Testing & Validation** - Comprehensive testing suite
5. **Vertex AI Integration** - Phase 2 implementation
6. **Documentation Update** - Update all project docs post-migration

---

*This plan provides complete context for resuming migration work in future sessions. All current MongoDB models, dependencies, and migration strategy are documented for seamless continuation.*
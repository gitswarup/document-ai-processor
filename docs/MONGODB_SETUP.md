# MongoDB Setup for Form Autofill Project

## Prerequisites
- Node.js installed
- MongoDB Community Edition

## Step 1: Install MongoDB Community Edition

### macOS (using Homebrew)
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb/brew/mongodb-community
```

### Windows
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer with default settings
3. MongoDB will start automatically as a Windows service

### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

## Step 2: Verify MongoDB Installation

```bash
# Check if MongoDB is running
mongo --version

# Connect to MongoDB (optional)
mongosh
```

## Step 3: Project Setup

```bash
# Navigate to server directory
cd /path/to/your/project/server

# Install dependencies (if not already done)
npm install

# Copy environment file (if needed)
cp .env.example .env

# Start the application
npm run dev
```

## Step 4: Verify Database Connection

1. Start your application with `npm run dev`
2. Look for these messages in the console:
   ```
   MongoDB connected: localhost:27017
   Database: form-autofill
   Document AI Processor server running on port 5000
   ```

## Step 5: Test the Application

1. **Upload a document**: POST to `http://localhost:5000/api/process-document`
2. **View stored documents**: GET `http://localhost:5000/api/documents`
3. **Search documents**: GET `http://localhost:5000/api/search?q=filename`

## API Endpoints

- `POST /api/process-document` - Upload and process document
- `GET /api/documents` - Get all processed documents (last 50)
- `GET /api/documents/:id` - Get specific document by ID
- `DELETE /api/documents/:id` - Delete document and its index entries
- `GET /api/search?q=query` - Search documents by filename
- `GET /api/search/key/:keyName` - Search for a key across all documents (OPTIMIZED)
- `GET /api/search/key/:keyName?exact=true&limit=50` - Exact key match search with limit
- `GET /api/keys/stats` - Get key statistics and usage frequency
- `GET /api/health` - Health check

### Key Search API Examples

**Partial Key Search** (finds keys containing "name"):
```bash
GET /api/search/key/name
```
Response:
```json
{
  "searchKey": "name",
  "searchType": "partial",
  "results": [
    {
      "documentId": "...",
      "filename": "form-123.pdf",
      "originalFilename": "application.pdf", 
      "matches": [
        {"key": "First Name", "value": "John"},
        {"key": "Last Name", "value": "Doe"}
      ]
    }
  ],
  "totalDocuments": 1,
  "totalMatches": 2
}
```

**Exact Key Search** (finds exact key "Email"):
```bash
GET /api/search/key/Email?exact=true
```
Response:
```json
{
  "searchKey": "Email",
  "searchType": "exact",
  "results": [
    {
      "documentId": "...",
      "filename": "form-123.pdf",
      "originalFilename": "application.pdf",
      "value": "john@example.com"
    }
  ],
  "uniqueValues": ["john@example.com", "jane@example.com"],
  "totalDocuments": 2,
  "valueFrequency": [
    {
      "value": "john@example.com",
      "count": 1,
      "filenames": ["application.pdf"]
    }
  ]
}
```

## Database Schema

### Main Document Collection (FormData)
Your documents are stored with this flexible schema:
- `filename` - Generated unique filename
- `originalFilename` - Original uploaded filename
- `keyValuePairs` - Extracted form data (flexible object)
- `confidence` - Processing confidence score
- `extractedText` - Full extracted text
- `processingMethod` - OCR method used (tesseract, google-vision, etc.)
- `metadata` - File size, mime type, processing time
- `createdAt` / `updatedAt` - Automatic timestamps

### Key-Value Index Collection (KeyValueIndex) - Performance Optimized
For fast key searches, each key-value pair is also stored separately with indexes:
- `documentId` - Reference to main document
- `filename` / `originalFilename` - File identification
- `key` - Original key name (e.g., "First Name")
- `keyNormalized` - Normalized key for searching (e.g., "first_name")
- `value` - The extracted value
- `valueType` - Data type (string, number, boolean, etc.)
- `extractedAt` - Timestamp

### Performance Benefits
- **Indexed searches**: Sub-second key lookups even with millions of documents
- **Compound indexes**: Optimized for key + value, key + date combinations
- **Text search**: Full-text search on key names
- **Aggregation ready**: Fast statistics and analytics

## Troubleshooting

### MongoDB Connection Issues
1. **Check if MongoDB is running**:
   ```bash
   # macOS
   brew services list | grep mongodb
   
   # Linux
   sudo systemctl status mongod
   
   # Windows
   services.msc (look for MongoDB Server)
   ```

2. **Check MongoDB logs**:
   ```bash
   # macOS
   tail -f /usr/local/var/log/mongodb/mongo.log
   
   # Linux
   sudo tail -f /var/log/mongodb/mongod.log
   ```

3. **Restart MongoDB**:
   ```bash
   # macOS
   brew services restart mongodb/brew/mongodb-community
   
   # Linux
   sudo systemctl restart mongod
   ```

### Common Issues
- **Port 27017 already in use**: Another MongoDB instance is running
- **Permission denied**: Check MongoDB data directory permissions
- **Connection timeout**: Ensure MongoDB service is started

## MongoDB GUI Tools (Optional)
- **MongoDB Compass** - Official GUI (free)
- **Robo 3T** - Lightweight MongoDB GUI
- **Studio 3T** - Advanced MongoDB IDE

Download from their respective websites for easier database management.
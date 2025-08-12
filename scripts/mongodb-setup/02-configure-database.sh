#!/bin/bash

# MongoDB Atlas Database Configuration Script
# This script creates the database and required collections

set -e

echo "🗄️ MongoDB Atlas Database Setup - Step 2: Configuring Database"
echo "==============================================================="

# Load configuration
if [ -f ".mongodb-config" ]; then
    source .mongodb-config
    echo "✅ Configuration loaded from .mongodb-config"
else
    echo "❌ Configuration file not found. Please run ./01-create-cluster.sh first"
    exit 1
fi

# Check if atlas CLI is available
if ! command -v atlas &> /dev/null; then
    echo "❌ MongoDB Atlas CLI is not installed."
    exit 1
fi

# Check cluster status
echo "🔍 Checking cluster status..."
CLUSTER_STATE=$(atlas clusters describe "$CLUSTER_NAME" --projectId "$ATLAS_PROJECT_ID" --output json | jq -r '.stateName' 2>/dev/null || echo "UNKNOWN")

if [ "$CLUSTER_STATE" != "IDLE" ]; then
    echo "⏳ Cluster is not ready yet. Current state: $CLUSTER_STATE"
    echo "   Please wait for the cluster to be in 'IDLE' state before running this script."
    echo "   You can check status with: atlas clusters describe $CLUSTER_NAME --projectId $ATLAS_PROJECT_ID"
    exit 1
fi

echo "✅ Cluster is ready (state: $CLUSTER_STATE)"
echo ""

# Database and collection configuration
echo "🔧 Database configuration:"
echo "   Database: $DATABASE_NAME"
echo "   Collections: formdata, keyvalueindices, chathistories"
echo ""

# Note: MongoDB Atlas creates databases and collections automatically when first document is inserted
# We'll create a temporary connection to initialize the database structure

echo "📝 Creating database initialization script..."
cat > init-database.js << 'EOF'
// MongoDB Database Initialization Script
// This script creates the database and collections with proper indexes

const dbName = 'form-autofill-staging';

print('🚀 Initializing database: ' + dbName);

// Switch to the target database
use(dbName);

// Create collections with validation and indexes
print('📦 Creating formdata collection...');
db.createCollection('formdata', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["filename", "uploadDate"],
            properties: {
                filename: {
                    bsonType: "string",
                    description: "must be a string and is required"
                },
                uploadDate: {
                    bsonType: "date",
                    description: "must be a date and is required"
                },
                fileSize: {
                    bsonType: "number",
                    description: "must be a number"
                },
                mimeType: {
                    bsonType: "string",
                    description: "must be a string"
                },
                extractedData: {
                    bsonType: "object",
                    description: "must be an object containing extracted form data"
                },
                processingStatus: {
                    bsonType: "string",
                    enum: ["pending", "processing", "completed", "failed"],
                    description: "must be a valid processing status"
                }
            }
        }
    }
});

// Create indexes for formdata
db.formdata.createIndex({ "uploadDate": -1 });
db.formdata.createIndex({ "filename": 1 });
db.formdata.createIndex({ "processingStatus": 1 });

print('🔑 Created formdata collection with indexes');

print('📦 Creating keyvalueindices collection...');
db.createCollection('keyvalueindices', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["documentId", "key", "value"],
            properties: {
                documentId: {
                    bsonType: "objectId",
                    description: "must be an ObjectId referencing formdata and is required"
                },
                key: {
                    bsonType: "string",
                    description: "must be a string and is required"
                },
                value: {
                    bsonType: "string",
                    description: "must be a string and is required"
                },
                confidence: {
                    bsonType: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "must be a number between 0 and 1"
                },
                createdAt: {
                    bsonType: "date",
                    description: "must be a date"
                }
            }
        }
    }
});

// Create indexes for keyvalueindices
db.keyvalueindices.createIndex({ "documentId": 1 });
db.keyvalueindices.createIndex({ "key": 1 });
db.keyvalueindices.createIndex({ "key": 1, "value": 1 });

print('🔑 Created keyvalueindices collection with indexes');

print('📦 Creating chathistories collection...');
db.createCollection('chathistories', {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["sessionId", "messages", "createdAt"],
            properties: {
                sessionId: {
                    bsonType: "string",
                    description: "must be a string and is required"
                },
                messages: {
                    bsonType: "array",
                    description: "must be an array of message objects",
                    items: {
                        bsonType: "object",
                        required: ["role", "content", "timestamp"],
                        properties: {
                            role: {
                                bsonType: "string",
                                enum: ["user", "assistant"],
                                description: "must be either 'user' or 'assistant'"
                            },
                            content: {
                                bsonType: "string",
                                description: "must be a string"
                            },
                            timestamp: {
                                bsonType: "date",
                                description: "must be a date"
                            }
                        }
                    }
                },
                createdAt: {
                    bsonType: "date",
                    description: "must be a date and is required"
                },
                updatedAt: {
                    bsonType: "date",
                    description: "must be a date"
                }
            }
        }
    }
});

// Create indexes for chathistories
db.chathistories.createIndex({ "sessionId": 1 });
db.chathistories.createIndex({ "createdAt": -1 });

print('🔑 Created chathistories collection with indexes');

print('✅ Database initialization completed successfully!');
print('📊 Database stats:');
printjson(db.stats());

print('📋 Collections created:');
db.getCollectionNames().forEach(function(collection) {
    print('  - ' + collection);
});
EOF

echo "⏳ Connecting to cluster and initializing database..."
echo "   This will create the database and collections with proper validation and indexes"
echo ""

# Execute the initialization script
# Note: This requires the user to have already set up authentication in the next script
# For now, we'll just prepare the script and provide instructions

echo "📁 Database initialization script created: init-database.js"
echo ""
echo "⚠️  Manual step required:"
echo "   After completing security setup (Step 3), you can initialize the database by:"
echo "   1. Connect to your cluster using MongoDB Compass or mongosh"
echo "   2. Run the init-database.js script"
echo "   3. Or use: mongosh <connection-string> < init-database.js"
echo ""

# Save the script location to config
echo "INIT_SCRIPT=$(pwd)/init-database.js" >> .mongodb-config

echo "✅ Database configuration prepared!"
echo ""
echo "📋 Next steps:"
echo "   1. Run security configuration: ./03-configure-security.sh"
echo "   2. After security setup, run the initialization script to create collections"
echo ""
echo "🎯 Database configuration script completed!"
#!/bin/bash

# MongoDB Atlas Connection String Retrieval Script
# This script retrieves and formats connection strings for different environments

set -e

echo "🔗 MongoDB Atlas Connection String - Step 4: Get Connection Details"
echo "===================================================================="

# Load configuration
if [ -f ".mongodb-config" ]; then
    source .mongodb-config
    echo "✅ Configuration loaded from .mongodb-config"
else
    echo "❌ Configuration file not found. Please run the setup scripts first"
    exit 1
fi

echo ""
echo "📋 Cluster Information:"
echo "   Project: $ATLAS_PROJECT_ID"
echo "   Cluster: $CLUSTER_NAME"
echo "   Database: $DATABASE_NAME"
echo "   Username: $DB_USERNAME"
echo ""

# Function to get connection string
get_connection_string() {
    local connection_type="$1"
    local description="$2"
    
    echo "⏳ Retrieving $description connection string..."
    local conn_string
    conn_string=$(atlas clusters connectionstring "$CLUSTER_NAME" --projectId "$ATLAS_PROJECT_ID" --type "$connection_type" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$conn_string" ]; then
        echo "$conn_string"
        return 0
    else
        echo "❌ Failed to retrieve $description connection string"
        return 1
    fi
}

# Function to format connection string
format_connection_string() {
    local base_string="$1"
    local username="$2"
    local password="$3"
    local database="$4"
    
    echo "$base_string" | \
        sed "s/<username>/$username/g" | \
        sed "s/<password>/$password/g" | \
        sed "s/test/$database/g"
}

echo "🔍 Available Connection String Formats:"
echo "========================================"
echo ""

# 1. Standard Connection String
echo "1️⃣ Standard Connection String (recommended for applications)"
echo "-----------------------------------------------------------"
standard_string=$(get_connection_string "standard" "standard")
if [ $? -eq 0 ]; then
    if [ -n "$DB_PASSWORD" ]; then
        formatted_standard=$(format_connection_string "$standard_string" "$DB_USERNAME" "[PASSWORD]" "$DATABASE_NAME")
        full_standard=$(format_connection_string "$standard_string" "$DB_USERNAME" "$DB_PASSWORD" "$DATABASE_NAME")
        echo "Template: $formatted_standard"
        echo "With Credentials: [Hidden for security - check .env.mongodb file]"
    else
        template_standard=$(format_connection_string "$standard_string" "$DB_USERNAME" "[PASSWORD]" "$DATABASE_NAME")
        echo "Template: $template_standard"
        echo "⚠️  Password not found in config. Please replace [PASSWORD] with actual password."
    fi
    echo ""
fi

# 2. MongoDB Compass Connection String
echo "2️⃣ MongoDB Compass Connection String (GUI tool)"
echo "-----------------------------------------------"
if [ -n "$standard_string" ]; then
    if [ -n "$DB_PASSWORD" ]; then
        compass_string=$(format_connection_string "$standard_string" "$DB_USERNAME" "$DB_PASSWORD" "$DATABASE_NAME")
        echo "Ready for MongoDB Compass: [Hidden for security]"
        echo "💡 Use the connection string from .env.mongodb file"
    else
        compass_template=$(format_connection_string "$standard_string" "$DB_USERNAME" "[PASSWORD]" "$DATABASE_NAME")
        echo "Template: $compass_template"
        echo "⚠️  Replace [PASSWORD] with actual password before using in Compass"
    fi
    echo ""
fi

# 3. mongosh Connection String
echo "3️⃣ mongosh Connection String (MongoDB Shell)"
echo "--------------------------------------------"
if [ -n "$standard_string" ]; then
    if [ -n "$DB_PASSWORD" ]; then
        echo "Command: mongosh \"[connection-string-from-.env.mongodb]\""
        echo "💡 Use the MONGODB_URI from .env.mongodb file"
    else
        mongosh_template=$(format_connection_string "$standard_string" "$DB_USERNAME" "[PASSWORD]" "$DATABASE_NAME")
        echo "Template: mongosh \"$mongosh_template\""
        echo "⚠️  Replace [PASSWORD] with actual password"
    fi
    echo ""
fi

# 4. Application Environment Variables
echo "4️⃣ Environment Variables for Applications"
echo "----------------------------------------"
echo "The following environment variables have been prepared:"
echo ""

if [ -f ".env.mongodb" ]; then
    echo "📁 .env.mongodb (contains actual credentials):"
    echo "   MONGODB_URI=<connection-string-with-credentials>"
    echo "   DB_NAME=$DATABASE_NAME"
    echo "   DB_USERNAME=$DB_USERNAME"
    echo ""
    echo "📁 .env.mongodb.template (safe for version control):"
    cat .env.mongodb.template | head -5
    echo "   ..."
    echo ""
else
    echo "❌ Environment files not found. Please run ./03-configure-security.sh first"
fi

# 5. Connection Testing
echo "5️⃣ Connection Testing"
echo "--------------------"
echo "🧪 Test your connection:"
echo ""

if command -v mongosh &> /dev/null; then
    if [ -f ".env.mongodb" ]; then
        echo "   Method 1: Using environment file"
        echo "   source .env.mongodb && mongosh \"\$MONGODB_URI\""
        echo ""
    fi
    
    echo "   Method 2: Direct connection (replace [PASSWORD])"
    if [ -n "$standard_string" ]; then
        test_string=$(format_connection_string "$standard_string" "$DB_USERNAME" "[PASSWORD]" "$DATABASE_NAME")
        echo "   mongosh \"$test_string\""
    fi
    echo ""
else
    echo "   ⚠️  mongosh not installed. Install it to test connections:"
    echo "   https://www.mongodb.com/docs/mongodb-shell/install/"
    echo ""
fi

# 6. Quick Test Script
echo "6️⃣ Quick Connection Test"
echo "-----------------------"
if [ -f ".env.mongodb" ]; then
    echo "Would you like to test the connection now? (y/N)"
    read -p "Test connection: " test_now
    
    if [[ $test_now =~ ^[Yy]$ ]]; then
        if command -v mongosh &> /dev/null; then
            echo "⏳ Testing connection..."
            source .env.mongodb
            echo "use $DB_NAME; db.runCommand({ping: 1}); print('✅ Connection successful!');" | mongosh "$MONGODB_URI" --quiet
            
            if [ $? -eq 0 ]; then
                echo "✅ Connection test passed!"
                
                # Test database initialization if init script exists
                if [ -f "init-database.js" ]; then
                    echo ""
                    echo "🗄️ Would you like to initialize the database collections now? (y/N)"
                    read -p "Initialize database: " init_db
                    
                    if [[ $init_db =~ ^[Yy]$ ]]; then
                        echo "⏳ Initializing database collections..."
                        mongosh "$MONGODB_URI" < init-database.js
                        
                        if [ $? -eq 0 ]; then
                            echo "✅ Database initialization completed!"
                        else
                            echo "❌ Database initialization failed"
                        fi
                    fi
                fi
            else
                echo "❌ Connection test failed. Please check your credentials and network access."
            fi
        else
            echo "❌ mongosh not available for testing"
        fi
    fi
else
    echo "❌ No credentials found. Please run ./03-configure-security.sh first"
fi

echo ""
echo "📋 Summary of Available Files:"
echo "============================"
echo "✅ .mongodb-config - Script configuration"
echo "$([ -f '.env.mongodb' ] && echo '✅' || echo '❌') .env.mongodb - Full environment with credentials"
echo "$([ -f '.env.mongodb.template' ] && echo '✅' || echo '❌') .env.mongodb.template - Template for version control"
echo "$([ -f 'init-database.js' ] && echo '✅' || echo '❌') init-database.js - Database initialization script"
echo ""

echo "🔒 Security Reminders:"
echo "====================="
echo "• Never commit .env.mongodb to version control"
echo "• Add .env.mongodb to your .gitignore"
echo "• Use .env.mongodb.template for sharing configuration"
echo "• Rotate passwords regularly"
echo "• Consider using more restrictive network access in production"
echo ""

echo "🎯 Connection string retrieval completed!"
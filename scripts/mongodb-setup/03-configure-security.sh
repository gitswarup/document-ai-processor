#!/bin/bash

# MongoDB Atlas Security Configuration Script
# This script creates database users and configures network access

set -e

echo "🔐 MongoDB Atlas Security Setup - Step 3: Configuring Security"
echo "=============================================================="

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

echo ""
echo "🔧 Security Configuration for:"
echo "   Project: $ATLAS_PROJECT_ID"
echo "   Cluster: $CLUSTER_NAME"
echo "   Database: $DATABASE_NAME"
echo ""

# 1. Create Database User
echo "👤 Step 1: Creating Database User"
echo "================================="

# Prompt for database user credentials
if [ -z "$DB_USERNAME" ]; then
    echo "📝 Enter username for database access:"
    read -p "Username: " DB_USERNAME
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "📝 Enter password for database user (will be hidden):"
    read -s -p "Password: " DB_PASSWORD
    echo ""
fi

# Validate password strength
if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo "⚠️  Warning: Password should be at least 8 characters long"
    read -p "Continue anyway? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "❌ Operation cancelled. Please run the script again with a stronger password."
        exit 1
    fi
fi

echo "⏳ Creating database user..."
atlas dbusers create \
    --username "$DB_USERNAME" \
    --password "$DB_PASSWORD" \
    --role readWrite \
    --database "$DATABASE_NAME" \
    --projectId "$ATLAS_PROJECT_ID"

if [ $? -eq 0 ]; then
    echo "✅ Database user '$DB_USERNAME' created successfully with readWrite permissions"
else
    echo "❌ Failed to create database user"
    exit 1
fi

echo ""

# 2. Configure Network Access
echo "🌐 Step 2: Configuring Network Access"
echo "====================================="

echo "📋 Network access options:"
echo "   1. Allow access from anywhere (0.0.0.0/0) - Good for staging/development"
echo "   2. Allow access from current IP only - More secure"
echo "   3. Allow access from specific IP/CIDR - Custom configuration"
echo ""

read -p "Select option (1-3): " network_option

case $network_option in
    1)
        echo "⏳ Adding network access rule for anywhere (0.0.0.0/0)..."
        atlas accesslists create \
            --cidr "0.0.0.0/0" \
            --comment "Allow access from anywhere (staging environment)" \
            --projectId "$ATLAS_PROJECT_ID"
        
        if [ $? -eq 0 ]; then
            echo "✅ Network access configured for anywhere (0.0.0.0/0)"
            NETWORK_CONFIG="0.0.0.0/0 (anywhere)"
        else
            echo "❌ Failed to configure network access"
            exit 1
        fi
        ;;
    2)
        echo "⏳ Getting current IP address..."
        CURRENT_IP=$(curl -s ifconfig.me)
        if [ -z "$CURRENT_IP" ]; then
            echo "❌ Could not determine current IP address"
            exit 1
        fi
        
        echo "   Current IP: $CURRENT_IP"
        echo "⏳ Adding network access rule for current IP..."
        atlas accesslists create \
            --ip "$CURRENT_IP" \
            --comment "Current IP access ($(date))" \
            --projectId "$ATLAS_PROJECT_ID"
        
        if [ $? -eq 0 ]; then
            echo "✅ Network access configured for current IP ($CURRENT_IP)"
            NETWORK_CONFIG="$CURRENT_IP (current IP)"
        else
            echo "❌ Failed to configure network access"
            exit 1
        fi
        ;;
    3)
        echo "📝 Enter IP address or CIDR block:"
        read -p "IP/CIDR: " custom_ip
        
        echo "📝 Enter a comment for this access rule:"
        read -p "Comment: " custom_comment
        
        echo "⏳ Adding network access rule for $custom_ip..."
        if [[ $custom_ip =~ "/" ]]; then
            # CIDR block
            atlas accesslists create \
                --cidr "$custom_ip" \
                --comment "$custom_comment" \
                --projectId "$ATLAS_PROJECT_ID"
        else
            # Single IP
            atlas accesslists create \
                --ip "$custom_ip" \
                --comment "$custom_comment" \
                --projectId "$ATLAS_PROJECT_ID"
        fi
        
        if [ $? -eq 0 ]; then
            echo "✅ Network access configured for $custom_ip"
            NETWORK_CONFIG="$custom_ip (custom)"
        else
            echo "❌ Failed to configure network access"
            exit 1
        fi
        ;;
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

echo ""

# 3. Generate Connection String
echo "🔗 Step 3: Generating Connection String"
echo "======================================="

# Get the connection string
echo "⏳ Retrieving connection string..."
CONNECTION_STRING=$(atlas clusters connectionstring "$CLUSTER_NAME" --projectId "$ATLAS_PROJECT_ID" --type standard)

if [ $? -eq 0 ] && [ -n "$CONNECTION_STRING" ]; then
    # Replace placeholders in connection string
    FULL_CONNECTION_STRING=$(echo "$CONNECTION_STRING" | sed "s/<username>/$DB_USERNAME/g" | sed "s/<password>/$DB_PASSWORD/g" | sed "s/test/$DATABASE_NAME/g")
    
    echo "✅ Connection string generated successfully"
    echo ""
    echo "🔒 Your MongoDB connection details:"
    echo "   Username: $DB_USERNAME"
    echo "   Database: $DATABASE_NAME"
    echo "   Network Access: $NETWORK_CONFIG"
    echo ""
else
    echo "❌ Failed to retrieve connection string"
    exit 1
fi

# 4. Save Configuration
echo "💾 Step 4: Saving Configuration"
echo "==============================="

# Update config file with security information
cat >> .mongodb-config << EOF

# Security Configuration
DB_USERNAME=$DB_USERNAME
DATABASE_NAME=$DATABASE_NAME
NETWORK_CONFIG=$NETWORK_CONFIG

# Connection String (with credentials)
MONGODB_CONNECTION_STRING=$FULL_CONNECTION_STRING
EOF

echo "✅ Security configuration saved to .mongodb-config"

# Create environment file for application
cat > .env.mongodb << EOF
# MongoDB Atlas Configuration for $DATABASE_NAME
# Generated on $(date)

MONGODB_URI=$FULL_CONNECTION_STRING

# Database Configuration
DB_NAME=$DATABASE_NAME
DB_USERNAME=$DB_USERNAME

# Collections
FORMDATA_COLLECTION=formdata
KEYVALUE_COLLECTION=keyvalueindices
CHATHISTORY_COLLECTION=chathistories
EOF

echo "✅ Environment configuration saved to .env.mongodb"

# Create a secure version without password for version control
SAFE_CONNECTION_STRING=$(echo "$CONNECTION_STRING" | sed "s/<username>/$DB_USERNAME/g" | sed "s/test/$DATABASE_NAME/g")
cat > .env.mongodb.template << EOF
# MongoDB Atlas Configuration Template
# Copy this to .env.mongodb and replace <password> with actual password

MONGODB_URI=$SAFE_CONNECTION_STRING

# Database Configuration
DB_NAME=$DATABASE_NAME
DB_USERNAME=$DB_USERNAME

# Collections
FORMDATA_COLLECTION=formdata
KEYVALUE_COLLECTION=keyvalueindices
CHATHISTORY_COLLECTION=chathistories
EOF

echo "✅ Template configuration saved to .env.mongodb.template (safe for version control)"

echo ""
echo "🔐 Security Configuration Summary"
echo "================================"
echo "✅ Database user created: $DB_USERNAME"
echo "✅ Network access configured: $NETWORK_CONFIG"
echo "✅ Connection string generated and saved"
echo "✅ Environment files created"
echo ""

echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   • .env.mongodb contains your password - DO NOT commit to version control"
echo "   • Add .env.mongodb to your .gitignore file"
echo "   • Use .env.mongodb.template for version control instead"
echo "   • Consider rotating passwords regularly"
echo ""

# Test connection (optional)
echo "🧪 Would you like to test the database connection? (y/N)"
read -p "Test connection: " test_connection

if [[ $test_connection =~ ^[Yy]$ ]]; then
    echo "⏳ Testing connection..."
    if command -v mongosh &> /dev/null; then
        echo "use $DATABASE_NAME; db.runCommand({ping: 1})" | mongosh "$FULL_CONNECTION_STRING" --quiet
        if [ $? -eq 0 ]; then
            echo "✅ Connection test successful!"
        else
            echo "❌ Connection test failed"
        fi
    else
        echo "⚠️  mongosh not found. Skipping connection test."
        echo "   Install mongosh to test connections: https://www.mongodb.com/docs/mongodb-shell/install/"
    fi
fi

echo ""
echo "📋 Next steps:"
echo "   1. Initialize database collections: Run the init-database.js script"
echo "   2. Get connection string: ./04-get-connection-string.sh"
echo "   3. Or run the master setup script for complete setup"
echo ""
echo "🎯 Security configuration script completed!"
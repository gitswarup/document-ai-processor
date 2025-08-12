#!/bin/bash

# MongoDB Atlas Cluster Creation Script
# This script creates a free M0 cluster in MongoDB Atlas

set -e

echo "🚀 MongoDB Atlas Cluster Setup - Step 1: Creating Cluster"
echo "============================================================"

# Configuration
CLUSTER_NAME="document-ai-staging"
PROVIDER="GCP"
REGION="CENTRAL_US"  # Maps to us-central1 in GCP
TIER="M0"  # Free tier

# Check if atlas CLI is installed
if ! command -v atlas &> /dev/null; then
    echo "❌ MongoDB Atlas CLI is not installed."
    echo "Please install it from: https://www.mongodb.com/docs/atlas/cli/stable/install-atlas-cli/"
    echo ""
    echo "Quick install options:"
    echo "  macOS: brew install mongodb-atlas-cli"
    echo "  Linux: curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor && echo 'deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list && sudo apt-get update && sudo apt-get install -y mongodb-atlas-cli"
    exit 1
fi

# Check if user is authenticated
if ! atlas auth whoami &> /dev/null; then
    echo "❌ Not authenticated with MongoDB Atlas."
    echo "Please run: atlas auth login"
    exit 1
fi

echo "✅ MongoDB Atlas CLI found and authenticated"
echo ""

# Get or prompt for project ID
if [ -z "$ATLAS_PROJECT_ID" ]; then
    echo "📝 Please provide your MongoDB Atlas Project ID:"
    echo "   (You can find this in your Atlas dashboard URL or create a new project)"
    echo ""
    echo "   If you don't have a project yet, create one at:"
    echo "   https://cloud.mongodb.com/v2#/preferences/organizations"
    echo ""
    read -p "Project ID: " ATLAS_PROJECT_ID
fi

echo "🔧 Creating MongoDB Atlas cluster with the following configuration:"
echo "   Project ID: $ATLAS_PROJECT_ID"
echo "   Cluster Name: $CLUSTER_NAME"
echo "   Provider: $PROVIDER"
echo "   Region: $REGION"
echo "   Tier: $TIER (Free)"
echo ""

# Create the cluster
echo "⏳ Creating cluster... (this may take 7-10 minutes)"
atlas clusters create "$CLUSTER_NAME" \
    --projectId "$ATLAS_PROJECT_ID" \
    --provider "$PROVIDER" \
    --region "$REGION" \
    --tier "$TIER" \
    --mdbVersion "7.0" \
    --diskSizeGB 0.5

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cluster '$CLUSTER_NAME' creation initiated successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Wait for cluster deployment to complete (7-10 minutes)"
    echo "   2. Run the database configuration script: ./02-configure-database.sh"
    echo "   3. Run the security configuration script: ./03-configure-security.sh"
    echo ""
    echo "💡 You can check cluster status with:"
    echo "   atlas clusters describe $CLUSTER_NAME --projectId $ATLAS_PROJECT_ID"
    echo ""
    
    # Save configuration for other scripts
    cat > .mongodb-config << EOF
ATLAS_PROJECT_ID=$ATLAS_PROJECT_ID
CLUSTER_NAME=$CLUSTER_NAME
DATABASE_NAME=form-autofill-staging
EOF
    
    echo "📁 Configuration saved to .mongodb-config for subsequent scripts"
    
else
    echo "❌ Failed to create cluster. Please check the error message above."
    exit 1
fi

echo ""
echo "🎯 Cluster creation script completed!"
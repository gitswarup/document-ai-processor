# MongoDB Atlas Setup Scripts

This directory contains scripts to automate the MongoDB Atlas setup process for the Document AI Processor project.

## 📋 Overview

These scripts automate the MongoDB Atlas setup process described in the GCP Deployment Guide (Step 2). They provide both modular individual scripts and a master orchestration script.

## 🛠️ Prerequisites

Before running these scripts, ensure you have:

1. **MongoDB Atlas CLI** installed:
   ```bash
   # macOS
   brew install mongodb-atlas-cli
   
   # Linux
   curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
   ```

2. **MongoDB Atlas Account**: Create at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

3. **Atlas CLI Authentication**:
   ```bash
   atlas auth login
   ```

4. **MongoDB Atlas Project**: Create a project in your Atlas dashboard

## 📁 Script Files

### Individual Scripts (Modular)

1. **`01-create-cluster.sh`** - Creates the MongoDB Atlas cluster
2. **`02-configure-database.sh`** - Sets up database and collections
3. **`03-configure-security.sh`** - Configures users and network access
4. **`04-get-connection-string.sh`** - Retrieves connection information

### Master Script

- **`setup-mongodb-atlas.sh`** - Orchestrates the complete setup process

## 🚀 Quick Start

### Option 1: Full Automatic Setup (Recommended)

```bash
# Make the master script executable
chmod +x setup-mongodb-atlas.sh

# Run the complete setup
./setup-mongodb-atlas.sh
```

Choose option `1` for full automatic setup with sensible defaults.

### Option 2: Manual Step-by-Step

```bash
# Make all scripts executable
chmod +x *.sh

# Step 1: Create cluster
./01-create-cluster.sh

# Step 2: Configure database
./02-configure-database.sh

# Step 3: Configure security
./03-configure-security.sh

# Step 4: Get connection string
./04-get-connection-string.sh
```

## 🎯 Setup Modes

The master script offers three setup modes:

### 1. 🚀 Full Automatic Setup
- Creates M0 cluster in Google Cloud (us-central1)
- Sets up database: `form-autofill-staging`
- Creates collections: `formdata`, `keyvalueindices`, `chathistories`
- Configures network access from anywhere (good for staging)
- Generates all necessary configuration files

### 2. 📋 Interactive Setup
- Prompts for each configuration option
- Allows customization of cluster settings
- Provides security options for network access
- Guided through each step

### 3. 🔧 Custom Setup
- Run only specific steps
- Useful for partial setup or troubleshooting
- Can combine multiple steps as needed

## 📄 Generated Files

After running the scripts, you'll have:

### Configuration Files
- **`.mongodb-config`** - Internal script configuration
- **`.env.mongodb`** - Application environment with credentials
- **`.env.mongodb.template`** - Version control safe template
- **`init-database.js`** - Database initialization script

### Security Notes
- ⚠️ **Never commit `.env.mongodb` to version control**
- ✅ Add `.env.mongodb` to your `.gitignore`
- ✅ Use `.env.mongodb.template` for sharing configuration
- ✅ Rotate passwords regularly

## 🔧 Configuration Details

### Default Cluster Configuration
```yaml
Provider: Google Cloud Platform
Region: us-central1 (Iowa)
Tier: M0 (Free - 512MB)
MongoDB Version: 7.0
Storage: 0.5GB
```

### Database Schema
```yaml
Database: form-autofill-staging
Collections:
  - formdata: Document processing data
  - keyvalueindices: Extracted key-value pairs
  - chathistories: Chat conversation history
```

### Network Access
- **Staging**: 0.0.0.0/0 (anywhere)
- **Production**: Restrict to specific IPs/CIDR blocks

## 🧪 Testing Connection

### Using MongoDB Shell (mongosh)
```bash
# Load environment
source .env.mongodb

# Connect and test
mongosh "$MONGODB_URI"
```

### Using MongoDB Compass
1. Open MongoDB Compass
2. Use the connection string from `.env.mongodb`
3. Connect and explore your database

## 🛠️ Troubleshooting

### Common Issues

1. **Atlas CLI Not Found**
   ```bash
   # Install Atlas CLI
   brew install mongodb-atlas-cli
   ```

2. **Authentication Failed**
   ```bash
   # Login to Atlas
   atlas auth login
   ```

3. **Cluster Creation Takes Too Long**
   - M0 clusters typically take 7-10 minutes to deploy
   - Check status: `atlas clusters describe <cluster-name> --projectId <project-id>`

4. **Network Access Issues**
   - Ensure your IP is whitelisted
   - For staging, use 0.0.0.0/0 temporarily
   - For production, use specific IP ranges

5. **Connection String Not Working**
   - Verify username and password
   - Check network access configuration
   - Ensure cluster is in IDLE state

### Script Debugging

Enable verbose output:
```bash
# Run with debugging
bash -x ./setup-mongodb-atlas.sh
```

### Manual Cleanup

If you need to start over:
```bash
# Delete cluster
atlas clusters delete <cluster-name> --projectId <project-id>

# Remove local files
rm .mongodb-config .env.mongodb .env.mongodb.template init-database.js
```

## 💰 Cost Information

### Free Tier Resources
- **M0 Cluster**: 512MB storage (Free forever)
- **Network Transfer**: 1GB free per month
- **Operations**: Unlimited reads/writes

### Estimated Costs
- **Free Tier**: $0/month
- **M2 Cluster**: ~$9/month (2GB storage)
- **M5 Cluster**: ~$25/month (5GB storage)

## 🔗 Integration with Application

### Environment Variables
```bash
# Copy from .env.mongodb to your application
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
DB_NAME=form-autofill-staging
DB_USERNAME=your-username
```

### Node.js Example
```javascript
const mongoose = require('mongoose');

// Use environment variable
mongoose.connect(process.env.MONGODB_URI);
```

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Atlas CLI Reference](https://www.mongodb.com/docs/atlas/cli/)
- [MongoDB Connection String URI Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [GCP Deployment Guide](../GCP_DEPLOYMENT_GUIDE.md)

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the MongoDB Atlas CLI documentation
3. Check your Atlas dashboard for cluster status
4. Verify your network connectivity

---

*Last Updated: January 2025*  
*Compatible with: MongoDB Atlas CLI v1.0+*
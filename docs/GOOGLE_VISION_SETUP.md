# Google Cloud Vision API Setup

## Prerequisites
1. Google Cloud Project with Vision API enabled
2. Billing enabled on your Google Cloud Project

## Setup Steps

### 1. Enable the Vision API
```bash
# Using gcloud CLI (if installed)
gcloud services enable vision.googleapis.com
```

Or visit: https://console.cloud.google.com/apis/library/vision.googleapis.com

### 2. Create Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click **Create Service Account**
4. Name: `vision-api-service`
5. Grant role: **Cloud Vision API User**
6. Click **Done**

### 3. Create and Download Key
1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create New Key**
4. Choose **JSON** format
5. Download the file
6. Rename it to `google-vision-service-account.json`
7. Place it in the `server/config/` directory

### 4. Update Environment Variables
Your `.env` file should already have:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./config/google-vision-service-account.json
GOOGLE_CLOUD_PROJECT_ID=document-ai-processor-468222
```

### 5. Test the Setup
Run your server and upload an image to test OCR functionality.

## Alternative Setup Methods

### Option 1: Environment Variable Path
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/full/path/to/service-account.json"
```

### Option 2: Using existing API Key (Limited functionality)
If you want to use your existing API key instead of service account, you would need to modify the Vision client initialization, but service accounts are recommended for server applications.

## Troubleshooting

- **Authentication Error**: Check if service account file exists and path is correct
- **Permission Denied**: Ensure the service account has Vision API User role
- **API Not Enabled**: Enable Vision API in Google Cloud Console
- **Billing Issues**: Ensure billing is enabled for your project

## Security Notes
- Never commit the service account JSON file to version control
- Add `config/*.json` to your `.gitignore`
- Use environment variables for production deployments
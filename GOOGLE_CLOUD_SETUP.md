# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API to test it as an alternative to Llama OCR.

## Prerequisites

1. **Google Account** - You need a Google account
2. **Credit Card** - Required for billing (Google offers free tier: 1000 requests/month)
3. **Basic familiarity with Google Cloud Console**

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "receipt-ocr-test")
4. Click "Create"

## Step 2: Enable Cloud Vision API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Cloud Vision API"
3. Click on it and press "Enable"

## Step 3: Set Up Billing

1. Go to "Billing" in the left menu
2. Click "Link a billing account"
3. Create a new billing account or link existing one
4. **Note**: Google offers 1000 free requests per month

## Step 4: Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - **Name**: receipt-ocr-service
   - **Description**: Service account for receipt OCR
4. Click "Create and Continue"
5. For "Role", select "Cloud Vision API User"
6. Click "Done"

## Step 5: Download Service Account Key

1. Click on your service account name
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Click "Create" - this downloads a JSON file
6. **Keep this file secure!** It contains your credentials

## Step 6: Set Up Authentication

### Option A: Environment Variable (Recommended)
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
```

### Option B: Place in Project (Less Secure)
1. Move the JSON key file to your project directory
2. Add it to `.gitignore` to prevent committing it
3. Update the service to use the local file

## Step 7: Test the Setup

1. Make sure you have a test image
2. Run the test script:
```bash
node test-google-vision.js path/to/your/test-image.jpg
```

## Step 8: Integration with Your App

To use Google Vision instead of Llama OCR in your main app:

1. **Option 1**: Replace the OCR service
   ```javascript
   // In your main app, replace:
   const ocr = require('./src/services/ocr');
   // With:
   const GoogleVisionService = require('./src/services/google-vision');
   const ocr = new GoogleVisionService();
   ```

2. **Option 2**: Add as alternative service
   ```javascript
   // Add both services and choose based on configuration
   const googleVision = new GoogleVisionService();
   const llamaOcr = require('./src/services/ocr');
   ```

## Pricing

- **Free Tier**: 1000 requests/month
- **Paid**: $1.50 per 1000 requests after free tier
- **Document Text Detection**: $1.50 per 1000 requests

## Troubleshooting

### Authentication Errors
- Check that `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
- Verify the JSON key file path is correct
- Ensure the service account has the right permissions

### API Errors
- Check that Cloud Vision API is enabled
- Verify billing is set up
- Check your quota limits

### Performance
- Google Vision is generally faster than Llama OCR
- Better at handling various text orientations
- Good multilingual support

## Comparison with Llama OCR

| Feature | Google Vision | Llama OCR |
|---------|---------------|-----------|
| Speed | Fast | Slower |
| Accuracy | High | High |
| Cost | $1.50/1000 req | Free with Together AI |
| Setup | Complex | Simple |
| Multilingual | Excellent | Good |
| Custom Training | No | Yes |

## Next Steps

1. Test with your receipt images
2. Compare results with Llama OCR
3. Decide which service works better for your use case
4. Consider implementing both as fallback options 
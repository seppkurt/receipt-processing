# 🚀 Quick Reference - Unified OCR Architecture

## 📋 Service Comparison

| Service | Switch To | Credentials | Free Tier | Best Use Case |
|---------|-----------|-------------|-----------|---------------|
| **Google Cloud Vision** | `'google'` | Service Account Key | 1,000 req/month | Production, high accuracy |
| **Tesseract.js** | `'tesseract'` | None | Unlimited | Development, privacy |
| **OCR.space** | `'ocrspace'` | API Key | 500 req/day | Simple integration |
| **Azure Computer Vision** | `'azure'` | Subscription Key | 5,000 req/month | Receipt understanding |

## 🔧 Basic Usage

```javascript
const OCRServiceFactory = require('./src/services/ocr-factory');

// 1. Create factory
const factory = new OCRServiceFactory();

// 2. Create service (change 'google' to any service name)
const service = await factory.createService('google', config, credentials);

// 3. Process image
const result = await service.processImage('receipt.jpg');

// 4. Extract structured data
const data = service.extractReceiptData(result);
```

## 🔑 Credentials Format

### Google Cloud Vision
```javascript
{ keyFilename: './google_keys/service-account.json' }
```

### OCR.space
```javascript
{ apiKey: 'your-api-key-here' }
```

### Azure Computer Vision
```javascript
{ 
  subscriptionKey: 'your-subscription-key',
  endpoint: 'https://your-resource.cognitiveservices.azure.com/'
}
```

### Tesseract.js
```javascript
{} // No credentials needed
```

## ⚙️ Configuration

```javascript
const config = {
  timeout: 30000,        // Request timeout in ms
  minConfidence: 0.3,    // Minimum confidence threshold
  language: 'deu'        // Language code (varies by service)
};
```

## 📊 Output Structure

### OCR Result
```javascript
{
  text: "Extracted text...",
  confidence: 0.85,
  processing_info: { /* metadata */ },
  raw_result: { /* original response */ }
}
```

### Receipt Data
```javascript
{
  retailer: { name: "dm", confidence: 0.9 },
  date: { value: "05.06.2025", confidence: 0.8 },
  total: { amount: 13.95, currency: "EUR" },
  items: [ /* array of items */ ],
  confidence: 0.85,
  rawText: "Full OCR text...",
  errors: []
}
```

## 🔄 Service Switching Patterns

### Simple Switch
```javascript
const service = await factory.createService('tesseract'); // Change service name
```

### Fallback Strategy
```javascript
const services = ['google', 'tesseract', 'ocrspace'];
let result = null;

for (const serviceName of services) {
  try {
    const service = await factory.createService(serviceName, config, credentials[serviceName]);
    result = await service.processImage('receipt.jpg');
    break; // Use first successful result
  } catch (error) {
    console.log(`${serviceName} failed:`, error.message);
  }
}
```

### Best Result Strategy
```javascript
const results = [];
for (const serviceName of services) {
  try {
    const service = await factory.createService(serviceName, config, credentials[serviceName]);
    const result = await service.processImage('receipt.jpg');
    results.push({ service: serviceName, result, confidence: result.confidence });
  } catch (error) {
    console.log(`${serviceName} failed:`, error.message);
  }
}

// Use result with highest confidence
const bestResult = results.reduce((best, current) => 
  current.confidence > best.confidence ? current : best
);
```

## 🧪 Testing

### Test Single Service
```javascript
node test-ocrspace.js images/test/dm_1.jpg
```

### Test All Services
```javascript
node test-unified-ocr.js images/test/dm_1.jpg
```

### Test Multi-OCR
```javascript
node test-multi-ocr.js images/test/dm_1.jpg
```

## 🔍 Validation

```javascript
// Validate image
const validation = service.validateImage('receipt.jpg');
if (!validation.valid) {
  console.log('Validation failed:', validation.error);
}

// Get service info
const info = service.getServiceInfo();
console.log('Max file size:', info.maxFileSize);
console.log('Supported formats:', info.supportedFormats);
```

## 🚨 Error Handling

```javascript
try {
  const result = await service.processImage('receipt.jpg');
  const data = service.extractReceiptData(result);
  
  if (data.errors.length > 0) {
    console.log('Processing warnings:', data.errors);
  }
} catch (error) {
  console.error('Processing failed:', error.message);
  // Implement fallback strategy
}
```

## 📝 Environment Variables

```bash
# OCR.space
export OCRSPACE_API_KEY="your-api-key"

# Azure Computer Vision
export AZURE_VISION_KEY="your-subscription-key"
export AZURE_VISION_ENDPOINT="https://your-resource.cognitiveservices.azure.com/"

# Google Cloud Vision (uses service account file by default)
# No environment variables needed if using google_keys directory
```

## 🎯 Quick Decisions

- **Need high accuracy?** → Use `'google'` or `'azure'`
- **Want privacy?** → Use `'tesseract'`
- **Budget conscious?** → Use `'ocrspace'` or `'tesseract'`
- **Development/testing?** → Use `'tesseract'` (free)
- **Production?** → Use `'google'` or `'azure'`

## 📚 Files Overview

- `src/services/ocr-interface.js` - Base interface
- `src/services/ocr-factory.js` - Service factory
- `src/services/google-vision.js` - Google Cloud Vision
- `src/services/tesseract-ocr.js` - Tesseract.js
- `src/services/ocrspace-service.js` - OCR.space
- `src/services/azure-vision.js` - Azure Computer Vision
- `test-unified-ocr.js` - Comprehensive testing
- `UNIFIED_OCR_ARCHITECTURE.md` - Full documentation

---

**💡 Tip**: Start with `'tesseract'` for development (no credentials needed), then switch to cloud services for production. 
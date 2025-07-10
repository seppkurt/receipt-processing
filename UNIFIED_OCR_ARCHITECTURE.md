# 🔧 Unified OCR Architecture

A flexible, extensible architecture for OCR services that allows easy switching between different providers while maintaining a consistent API.

## 🎯 Overview

The unified OCR architecture provides:
- **Consistent API** across all OCR services
- **Easy service switching** without code changes
- **Structured receipt data extraction** 
- **Automatic fallback** capabilities
- **Service validation** and capability checking
- **Unified credential management**

## 🏗️ Architecture Components

### 1. **OCRServiceInterface** (`src/services/ocr-interface.js`)
The base interface that all OCR services must implement:

```javascript
class OCRServiceInterface {
  async initialize(credentials) { /* ... */ }
  async processImage(imageInput, options) { /* ... */ }
  getServiceInfo() { /* ... */ }
  validateImage(imageInput) { /* ... */ }
  extractReceiptData(ocrResult) { /* ... */ }
}
```

### 2. **OCRServiceFactory** (`src/services/ocr-factory.js`)
Factory for creating and managing OCR services:

```javascript
const factory = new OCRServiceFactory();
const service = await factory.createService('google', config, credentials);
```

### 3. **Service Implementations**
Each OCR service extends the interface:
- `GoogleVisionService` - Google Cloud Vision API
- `TesseractOCRService` - Local Tesseract.js processing
- `OCRSpaceService` - OCR.space REST API
- `AzureVisionService` - Azure Computer Vision (ready)

## 🚀 Quick Start

### Basic Usage

```javascript
const OCRServiceFactory = require('./src/services/ocr-factory');

// Create a service
const factory = new OCRServiceFactory();
const service = await factory.createService('google', {
  timeout: 30000,
  minConfidence: 0.3
}, {
  keyFilename: './google_keys/service-account.json'
});

// Process an image
const result = await service.processImage('receipt.jpg');

// Extract structured data
const receiptData = service.extractReceiptData(result);
console.log('Retailer:', receiptData.retailer?.name);
console.log('Total:', receiptData.total?.amount);
console.log('Items:', receiptData.items.length);
```

### Service Comparison

```javascript
// Test multiple services
const { services } = await factory.createMultipleServices(
  ['google', 'tesseract', 'ocrspace'],
  { timeout: 30000 },
  credentials
);

// Compare results
for (const [name, service] of Object.entries(services)) {
  const result = await service.processImage('receipt.jpg');
  const data = service.extractReceiptData(result);
  console.log(`${name}: ${data.retailer?.name} - ${data.total?.amount}€`);
}
```

## 📊 Available Services

| Service | Type | Credentials | Free Tier | Best For |
|---------|------|-------------|-----------|----------|
| **Google Cloud Vision** | Cloud | Service Account Key | 1,000 req/month | High accuracy, German support |
| **Tesseract.js** | Local | None | Unlimited | Privacy, offline processing |
| **OCR.space** | Cloud | API Key | 500 req/day | Simple integration |
| **Azure Computer Vision** | Cloud | Subscription Key | 5,000 req/month | Receipt understanding |

## 🔧 Service Configuration

### Google Cloud Vision
```javascript
const config = {
  timeout: 30000,
  minConfidence: 0.3,
  language: 'deu'
};

const credentials = {
  keyFilename: './google_keys/service-account.json'
};
```

### Tesseract.js
```javascript
const config = {
  timeout: 30000,
  minConfidence: 0.3,
  language: 'deu+eng' // German + English
};

const credentials = {}; // No credentials needed
```

### OCR.space
```javascript
const config = {
  timeout: 30000,
  minConfidence: 0.3,
  language: 'ger', // OCR.space uses 'ger' for German
  ocrEngine: 2, // Better accuracy
  scale: true,
  detectOrientation: true
};

const credentials = {
  apiKey: 'your-api-key-here'
};
```

## 📋 Standardized Output Format

### OCR Result
```javascript
{
  text: "Extracted text content...",
  confidence: 0.85, // 0-1 scale
  processing_info: {
    timestamp: "2025-07-10T...",
    service: "Google Cloud Vision",
    model: "OCR API v1",
    fileName: "receipt.jpg"
  },
  raw_result: { /* Original service response */ }
}
```

### Receipt Data
```javascript
{
  retailer: {
    name: "dm",
    fullLine: "dm-drogerie markt",
    confidence: 0.9
  },
  date: {
    value: "05.06.2025",
    fullLine: "05.06.2025 08:49",
    confidence: 0.8
  },
  total: {
    amount: 13.95,
    currency: "EUR",
    fullLine: "SUMME EUR 13,95",
    confidence: 0.9
  },
  items: [
    {
      name: "FF 3J GetreideR. Banane Traube",
      price: 1.95,
      quantity: 2,
      totalPrice: 3.90,
      confidence: 0.7
    }
  ],
  confidence: 0.85,
  rawText: "Full OCR text...",
  errors: []
}
```

## 🔄 Service Switching Strategies

### 1. **Simple Switch**
```javascript
// Change service by updating one line
const service = await factory.createService('tesseract'); // or 'google', 'ocrspace'
```

### 2. **Fallback Strategy**
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

### 3. **Best Result Strategy**
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

## 🛠️ Adding New Services

To add a new OCR service:

1. **Create service class** extending `OCRServiceInterface`:
```javascript
const OCRServiceInterface = require('./ocr-interface');

class NewOCRService extends OCRServiceInterface {
  constructor(config = {}) {
    super({
      serviceName: 'newservice',
      ...config
    });
  }

  async initialize(credentials) {
    // Initialize service with credentials
    this.isInitialized = true;
    return true;
  }

  async processImage(imageInput, options = {}) {
    // Process image and return standardized result
    return {
      text: "extracted text",
      confidence: 0.85,
      processing_info: { /* ... */ },
      raw_result: { /* original response */ }
    };
  }

  getServiceInfo() {
    return {
      name: this.config.serviceName,
      type: 'cloud', // or 'local'
      // ... other capabilities
    };
  }
}
```

2. **Add to factory**:
```javascript
// In OCRServiceFactory constructor
this.availableServices.newservice = {
  class: NewOCRService,
  name: 'New OCR Service',
  type: 'cloud',
  requiresCredentials: true,
  credentialsType: 'api-key',
  description: 'Description of the service'
};
```

## 🔍 Testing and Validation

### Service Validation
```javascript
// Validate image before processing
const validation = service.validateImage('receipt.jpg');
if (!validation.valid) {
  console.log('Validation failed:', validation.error);
  return;
}

// Get service capabilities
const info = service.getServiceInfo();
console.log('Max file size:', info.maxFileSize);
console.log('Supported formats:', info.supportedFormats);
```

### Comprehensive Testing
```javascript
// Test all available services
node test-unified-ocr.js images/test/dm_1.jpg
```

## 📈 Performance Comparison

From our tests with German receipts:

| Service | Speed | Accuracy | Cost | Privacy |
|---------|-------|----------|------|---------|
| **Google Cloud Vision** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Tesseract.js** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **OCR.space** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |

## 🎯 Best Practices

### 1. **Service Selection**
- **Production**: Use Google Cloud Vision or Azure for high accuracy
- **Development**: Use Tesseract.js for free testing
- **Privacy-sensitive**: Use Tesseract.js for local processing
- **Budget-conscious**: Use OCR.space with generous free tier

### 2. **Error Handling**
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

### 3. **Configuration Management**
```javascript
const config = {
  timeout: process.env.OCR_TIMEOUT || 30000,
  minConfidence: process.env.OCR_MIN_CONFIDENCE || 0.3,
  language: process.env.OCR_LANGUAGE || 'deu'
};
```

## 🔗 Integration Examples

### Express.js API
```javascript
const express = require('express');
const OCRServiceFactory = require('./src/services/ocr-factory');

const app = express();
const factory = new OCRServiceFactory();

app.post('/ocr', async (req, res) => {
  try {
    const service = await factory.createService('google', config, credentials);
    const result = await service.processImage(req.file.path);
    const data = service.extractReceiptData(result);
    
    res.json({
      success: true,
      data: data,
      service: 'google'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Batch Processing
```javascript
async function processReceipts(receiptPaths) {
  const service = await factory.createService('google', config, credentials);
  const results = [];
  
  for (const path of receiptPaths) {
    try {
      const result = await service.processImage(path);
      const data = service.extractReceiptData(result);
      results.push({ path, data, success: true });
    } catch (error) {
      results.push({ path, error: error.message, success: false });
    }
  }
  
  return results;
}
```

---

**Status**: ✅ **Production Ready**

The unified OCR architecture provides a robust, flexible foundation for receipt processing with easy service switching and comprehensive error handling. 
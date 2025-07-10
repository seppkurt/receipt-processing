const GoogleVisionService = require('./google-vision');
const AzureVisionService = require('./azure-vision');
const TesseractOCRService = require('./tesseract-ocr');

class MultiOCRService {
  constructor(config = {}) {
    this.config = {
      primary: 'google', // google, azure, tesseract
      fallback: 'tesseract', // fallback service
      timeout: 30000, // 30 seconds timeout
      minConfidence: 0.5, // minimum confidence threshold
      ...config
    };

    this.services = {};
    this.initializeServices();
  }

  initializeServices() {
    // Initialize Google Cloud Vision
    try {
      this.services.google = new GoogleVisionService();
      console.log('✅ Google Cloud Vision service initialized');
    } catch (error) {
      console.log('⚠️  Google Cloud Vision not available:', error.message);
    }

    // Initialize Azure Computer Vision
    try {
      this.services.azure = new AzureVisionService();
      if (this.services.azure.client) {
        console.log('✅ Azure Computer Vision service initialized');
      } else {
        console.log('⚠️  Azure Computer Vision not available (missing credentials)');
      }
    } catch (error) {
      console.log('⚠️  Azure Computer Vision not available:', error.message);
    }

    // Initialize Tesseract (always available)
    try {
      this.services.tesseract = new TesseractOCRService();
      console.log('✅ Tesseract.js service initialized');
    } catch (error) {
      console.log('⚠️  Tesseract.js not available:', error.message);
    }
  }

  async processImage(imagePath, options = {}) {
    const config = { ...this.config, ...options };
    const results = [];
    let bestResult = null;

    console.log('🔍 Multi-OCR processing started...');
    console.log(`📁 Image: ${imagePath}`);

    // Try primary service first
    if (this.services[config.primary]) {
      try {
        console.log(`🎯 Trying primary service: ${config.primary}`);
        const result = await this.processWithService(config.primary, imagePath, config.timeout);
        
        if (result && result.confidence >= config.minConfidence) {
          console.log(`✅ Primary service succeeded with ${(result.confidence * 100).toFixed(1)}% confidence`);
          return {
            ...result,
            service_used: config.primary,
            fallback_used: false
          };
        } else {
          results.push({ service: config.primary, result, error: 'Low confidence' });
        }
      } catch (error) {
        console.log(`❌ Primary service failed: ${error.message}`);
        results.push({ service: config.primary, error: error.message });
      }
    }

    // Try fallback service
    if (this.services[config.fallback] && config.fallback !== config.primary) {
      try {
        console.log(`🔄 Trying fallback service: ${config.fallback}`);
        const result = await this.processWithService(config.fallback, imagePath, config.timeout);
        
        if (result && result.confidence >= config.minConfidence) {
          console.log(`✅ Fallback service succeeded with ${(result.confidence * 100).toFixed(1)}% confidence`);
          return {
            ...result,
            service_used: config.fallback,
            fallback_used: true
          };
        } else {
          results.push({ service: config.fallback, result, error: 'Low confidence' });
        }
      } catch (error) {
        console.log(`❌ Fallback service failed: ${error.message}`);
        results.push({ service: config.fallback, error: error.message });
      }
    }

    // Try all available services
    for (const [serviceName, service] of Object.entries(this.services)) {
      if (serviceName !== config.primary && serviceName !== config.fallback) {
        try {
          console.log(`🔄 Trying additional service: ${serviceName}`);
          const result = await this.processWithService(serviceName, imagePath, config.timeout);
          
          if (result) {
            results.push({ service: serviceName, result });
            
            // Track best result
            if (!bestResult || result.confidence > bestResult.confidence) {
              bestResult = { ...result, service_used: serviceName, fallback_used: true };
            }
          }
        } catch (error) {
          console.log(`❌ ${serviceName} service failed: ${error.message}`);
          results.push({ service: serviceName, error: error.message });
        }
      }
    }

    // Return best result if any service succeeded
    if (bestResult) {
      console.log(`✅ Multi-OCR completed. Best result from ${bestResult.service_used} with ${(bestResult.confidence * 100).toFixed(1)}% confidence`);
      return bestResult;
    }

    // All services failed
    console.log('❌ All OCR services failed');
    throw new Error('All OCR services failed to process the image');
  }

  async processWithService(serviceName, imagePath, timeout) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not available`);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Service ${serviceName} timed out after ${timeout}ms`));
      }, timeout);

      service.processImage(imagePath)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  // Get service status
  getServiceStatus() {
    const status = {};
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      status[serviceName] = {
        available: !!service,
        type: this.getServiceType(serviceName),
        description: this.getServiceDescription(serviceName)
      };
    }
    
    return status;
  }

  getServiceType(serviceName) {
    const types = {
      google: 'Cloud API',
      azure: 'Cloud API',
      tesseract: 'Local Processing'
    };
    return types[serviceName] || 'Unknown';
  }

  getServiceDescription(serviceName) {
    const descriptions = {
      google: 'Google Cloud Vision API - High accuracy, paid service',
      azure: 'Azure Computer Vision API - High accuracy, paid service',
      tesseract: 'Tesseract.js - Free local OCR, lower accuracy'
    };
    return descriptions[serviceName] || 'Unknown service';
  }

  // Convert result to markdown using the appropriate service
  convertToMarkdown(result) {
    const serviceName = result.service_used;
    const service = this.services[serviceName];
    
    if (service && service.convertToMarkdown) {
      return service.convertToMarkdown(result);
    }
    
    // Fallback markdown conversion
    if (!result.text) {
      return '# Receipt\n\nNo text detected in image.';
    }

    return `# Receipt\n\n**Processed by:** ${serviceName}\n**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n\n${result.text}`;
  }

  // Get processing statistics
  getStats() {
    return {
      available_services: Object.keys(this.services).length,
      primary_service: this.config.primary,
      fallback_service: this.config.fallback,
      timeout: this.config.timeout,
      min_confidence: this.config.minConfidence
    };
  }
}

module.exports = MultiOCRService; 
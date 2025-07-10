const GoogleVisionService = require('./google-vision');
const AzureVisionService = require('./azure-vision');
const TesseractOCRService = require('./tesseract-ocr');
const OCRSpaceService = require('./ocrspace-service');

/**
 * OCR Service Factory
 * 
 * Provides a unified way to create and manage different OCR services.
 * Abstracts away the differences in initialization and configuration.
 */
class OCRServiceFactory {
  constructor() {
    this.availableServices = {
      google: {
        class: GoogleVisionService,
        name: 'Google Cloud Vision',
        type: 'cloud',
        requiresCredentials: true,
        credentialsType: 'service-account-key',
        description: 'High accuracy cloud OCR with good German support'
      },
      azure: {
        class: AzureVisionService,
        name: 'Azure Computer Vision',
        type: 'cloud',
        requiresCredentials: true,
        credentialsType: 'subscription-key-endpoint',
        description: 'Excellent receipt understanding with structured data extraction'
      },
      tesseract: {
        class: TesseractOCRService,
        name: 'Tesseract.js',
        type: 'local',
        requiresCredentials: false,
        credentialsType: null,
        description: 'Free local OCR processing, privacy-friendly'
      },
      ocrspace: {
        class: OCRSpaceService,
        name: 'OCR.space',
        type: 'cloud',
        requiresCredentials: true,
        credentialsType: 'api-key',
        description: 'Simple REST API with good free tier'
      }
    };
  }

  /**
   * Get list of available services
   * @returns {Object} - Available services information
   */
  getAvailableServices() {
    return this.availableServices;
  }

  /**
   * Get service information
   * @param {string} serviceName - Name of the service
   * @returns {Object|null} - Service information
   */
  getServiceInfo(serviceName) {
    return this.availableServices[serviceName] || null;
  }

  /**
   * Create an OCR service instance
   * @param {string} serviceName - Name of the service to create
   * @param {Object} config - Service configuration
   * @param {Object} credentials - Service credentials
   * @returns {Promise<Object>} - Initialized service instance
   */
  async createService(serviceName, config = {}, credentials = {}) {
    const serviceInfo = this.getServiceInfo(serviceName);
    
    if (!serviceInfo) {
      throw new Error(`Unknown OCR service: ${serviceName}. Available: ${Object.keys(this.availableServices).join(', ')}`);
    }

    try {
      console.log(`🔧 Creating ${serviceInfo.name} service...`);
      
      // Create service instance
      const ServiceClass = serviceInfo.class;
      const service = new ServiceClass(config);
      
      // Initialize if credentials are required
      if (serviceInfo.requiresCredentials) {
        if (!credentials || Object.keys(credentials).length === 0) {
          throw new Error(`${serviceInfo.name} requires credentials. Type: ${serviceInfo.credentialsType}`);
        }
        
        const initialized = await service.initialize(credentials);
        if (!initialized) {
          throw new Error(`Failed to initialize ${serviceInfo.name} service`);
        }
      } else {
        // For services that don't require credentials (like Tesseract)
        service.isInitialized = true;
      }
      
      console.log(`✅ ${serviceInfo.name} service created successfully`);
      return service;
      
    } catch (error) {
      console.error(`❌ Failed to create ${serviceInfo.name} service:`, error.message);
      throw error;
    }
  }

  /**
   * Create multiple services for comparison or fallback
   * @param {Array} serviceNames - Array of service names to create
   * @param {Object} config - Common configuration for all services
   * @param {Object} credentials - Credentials for all services
   * @returns {Promise<Object>} - Object with service instances
   */
  async createMultipleServices(serviceNames, config = {}, credentials = {}) {
    const services = {};
    const errors = [];
    
    for (const serviceName of serviceNames) {
      try {
        const service = await this.createService(serviceName, config, credentials[serviceName] || {});
        services[serviceName] = service;
      } catch (error) {
        console.warn(`⚠️  Could not create ${serviceName} service:`, error.message);
        errors.push({ service: serviceName, error: error.message });
      }
    }
    
    return { services, errors };
  }

  /**
   * Get recommended service configuration
   * @param {string} serviceName - Name of the service
   * @param {Object} useCase - Use case requirements
   * @returns {Object} - Recommended configuration
   */
  getRecommendedConfig(serviceName, useCase = {}) {
    const baseConfig = {
      timeout: 30000,
      minConfidence: 0.3,
      language: 'deu' // German
    };

    switch (serviceName) {
      case 'google':
        return {
          ...baseConfig,
          // Google Cloud Vision specific config
        };
        
      case 'azure':
        return {
          ...baseConfig,
          // Azure specific config
        };
        
      case 'tesseract':
        return {
          ...baseConfig,
          // Tesseract specific config
          language: 'deu+eng' // German + English
        };
        
      case 'ocrspace':
        return {
          ...baseConfig,
          language: 'ger', // OCR.space uses 'ger' for German
          ocrEngine: 2, // Better accuracy
          scale: true,
          detectOrientation: true
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Get credentials template for a service
   * @param {string} serviceName - Name of the service
   * @returns {Object} - Credentials template
   */
  getCredentialsTemplate(serviceName) {
    const serviceInfo = this.getServiceInfo(serviceName);
    
    if (!serviceInfo) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    if (!serviceInfo.requiresCredentials) {
      return { type: 'none', description: 'No credentials required' };
    }
    
    switch (serviceInfo.credentialsType) {
      case 'api-key':
        return {
          type: 'api-key',
          required: ['apiKey'],
          optional: [],
          description: 'Simple API key authentication',
          example: { apiKey: 'your-api-key-here' }
        };
        
      case 'subscription-key-endpoint':
        return {
          type: 'subscription-key-endpoint',
          required: ['subscriptionKey', 'endpoint'],
          optional: [],
          description: 'Azure subscription key and endpoint',
          example: { 
            subscriptionKey: 'your-subscription-key',
            endpoint: 'https://your-resource.cognitiveservices.azure.com/'
          }
        };
        
      case 'service-account-key':
        return {
          type: 'service-account-key',
          required: ['keyFilename'],
          optional: ['projectId'],
          description: 'Google Cloud service account key file',
          example: { keyFilename: '/path/to/service-account-key.json' }
        };
        
      default:
        return {
          type: 'unknown',
          description: 'Unknown credentials type'
        };
    }
  }

  /**
   * Validate credentials for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} credentials - Credentials to validate
   * @returns {Object} - Validation result
   */
  validateCredentials(serviceName, credentials) {
    const template = this.getCredentialsTemplate(serviceName);
    
    if (template.type === 'none') {
      return { valid: true, message: 'No credentials required' };
    }
    
    if (!credentials) {
      return { valid: false, error: 'Credentials are required' };
    }
    
    // Check required fields
    for (const field of template.required) {
      if (!credentials[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    return { valid: true, message: 'Credentials format is valid' };
  }

  /**
   * Compare services based on criteria
   * @param {Array} serviceNames - Services to compare
   * @param {Object} criteria - Comparison criteria
   * @returns {Object} - Comparison results
   */
  compareServices(serviceNames, criteria = {}) {
    const comparison = {};
    
    for (const serviceName of serviceNames) {
      const serviceInfo = this.getServiceInfo(serviceName);
      if (!serviceInfo) continue;
      
      comparison[serviceName] = {
        name: serviceInfo.name,
        type: serviceInfo.type,
        requiresCredentials: serviceInfo.requiresCredentials,
        description: serviceInfo.description,
        // Add more comparison fields as needed
      };
    }
    
    return comparison;
  }
}

module.exports = OCRServiceFactory; 
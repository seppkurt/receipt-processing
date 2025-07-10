const OCRServiceInterface = require('./ocr-interface');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class OCRSpaceService extends OCRServiceInterface {
  constructor(config = {}) {
    super({
      serviceName: 'ocrspace',
      timeout: 30000,
      minConfidence: 0.3,
      language: 'ger', // German for OCR.space
      ...config
    });
    
    this.apiKey = null;
    this.baseUrl = 'https://api.ocr.space/parse/image';
  }

  /**
   * Initialize the service with API key
   * @param {Object} credentials - Must contain apiKey
   * @returns {Promise<boolean>} - True if initialization successful
   */
  async initialize(credentials) {
    try {
      if (!credentials || !credentials.apiKey) {
        throw new Error('OCR.space API key is required');
      }

      this.apiKey = credentials.apiKey;
      
      // Test the API key with a simple request
      const testResult = await this.testConnection();
      if (!testResult.success) {
        throw new Error(`API key validation failed: ${testResult.error}`);
      }

      this.isInitialized = true;
      console.log('✅ OCR.space service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ OCR.space initialization failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Test the API connection
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      // Create a minimal test image (1x1 pixel)
      const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
      
      const response = await axios.post(this.baseUrl, {
        apikey: this.apiKey,
        language: this.config.language,
        filetype: 'jpg',
        image: testImageBuffer.toString('base64'),
        OCREngine: 2, // OCR Engine 2 for better accuracy
        isOverlayRequired: false
      }, {
        timeout: 10000
      });

      if (response.data && response.data.ParsedResults) {
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response format' };
      }

    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.ErrorMessage || error.message 
      };
    }
  }

  /**
   * Process an image and extract text
   * @param {string|Buffer} imageInput - Image file path or buffer
   * @param {Object} options - Processing options
   * @returns {Promise<OCRResult>} - Standardized OCR result
   */
  async processImage(imageInput, options = {}) {
    if (!this.isInitialized) {
      throw new Error('OCR.space service not initialized. Call initialize() first.');
    }

    try {
      // Validate input
      const validation = this.validateImage(imageInput);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.error}`);
      }

      console.log('🔍 Processing with OCR.space...');
      
      let imageBuffer;
      let fileName = 'image.jpg';

      if (typeof imageInput === 'string') {
        // File path
        imageBuffer = fs.readFileSync(imageInput);
        fileName = path.basename(imageInput);
        console.log('📁 Image:', fileName);
      } else if (Buffer.isBuffer(imageInput)) {
        // Buffer
        imageBuffer = imageInput;
        console.log('📁 Image: Buffer input');
      } else {
        throw new Error('Invalid image input type');
      }

      // Prepare request data
      const requestData = {
        apikey: this.apiKey,
        language: options.language || this.config.language,
        filetype: path.extname(fileName).substring(1) || 'jpg',
        image: imageBuffer.toString('base64'),
        OCREngine: options.ocrEngine || 2, // OCR Engine 2 for better accuracy
        isOverlayRequired: false,
        scale: options.scale || true,
        detectOrientation: options.detectOrientation || true
      };

      // Make API request
      const response = await axios.post(this.baseUrl, requestData, {
        timeout: options.timeout || this.config.timeout,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Parse response
      const result = this.parseResponse(response.data, fileName);
      
      console.log('✅ OCR.space processing completed');
      console.log('📄 Text length:', result.text.length);
      console.log('🎯 Confidence:', (result.confidence * 100).toFixed(1) + '%');

      return result;

    } catch (error) {
      console.error('❌ OCR.space processing error:', error.message);
      
      if (error.response?.data?.ErrorMessage) {
        throw new Error(`OCR.space API error: ${error.response.data.ErrorMessage}`);
      }
      
      throw error;
    }
  }

  /**
   * Parse OCR.space API response into standardized format
   * @param {Object} apiResponse - Raw API response
   * @param {string} fileName - Original file name
   * @returns {OCRResult} - Standardized OCR result
   */
  parseResponse(apiResponse, fileName) {
    if (!apiResponse || !apiResponse.ParsedResults || apiResponse.ParsedResults.length === 0) {
      return {
        text: '',
        confidence: 0,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'OCR.space',
          model: 'OCR Engine 2',
          fileName: fileName
        },
        raw_result: apiResponse,
        error: apiResponse?.ErrorMessage || 'No text detected'
      };
    }

    // Extract text from all parsed results
    let fullText = '';
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const parsedResult of apiResponse.ParsedResults) {
      if (parsedResult.ParsedText) {
        fullText += parsedResult.ParsedText + '\n';
      }
      
      if (parsedResult.TextOverlay && parsedResult.TextOverlay.Lines) {
        for (const line of parsedResult.TextOverlay.Lines) {
          if (line.Words) {
            for (const word of line.Words) {
              if (word.Confidence) {
                totalConfidence += word.Confidence;
                confidenceCount++;
              }
            }
          }
        }
      }
    }

    const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount / 100 : 0;

    return {
      text: fullText.trim(),
      confidence: avgConfidence,
      processing_info: {
        timestamp: new Date().toISOString(),
        service: 'OCR.space',
        model: 'OCR Engine 2',
        fileName: fileName,
        language: this.config.language
      },
      raw_result: apiResponse
    };
  }

  /**
   * Get service status and capabilities
   * @returns {Object} - Service information
   */
  getServiceInfo() {
    return {
      name: this.config.serviceName,
      type: 'cloud',
      isInitialized: this.isInitialized,
      supportsConfidence: true,
      supportsLanguages: ['eng', 'ger', 'fra', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor'],
      maxFileSize: 10 * 1024 * 1024, // 10MB
      supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.pdf'],
      pricing: {
        freeTier: '500 requests/day',
        costPerRequest: 0.0025 // Pro plan
      },
      features: [
        'Multiple OCR engines',
        'Orientation detection',
        'Scale detection',
        'Multiple language support',
        'PDF support'
      ]
    };
  }

  /**
   * Get available OCR engines
   * @returns {Array} - Available OCR engines
   */
  getAvailableEngines() {
    return [
      { id: 1, name: 'OCR Engine 1', description: 'Fast processing, lower accuracy' },
      { id: 2, name: 'OCR Engine 2', description: 'Better accuracy, slower processing' },
      { id: 3, name: 'OCR Engine 3', description: 'Best accuracy, slowest processing' }
    ];
  }

  /**
   * Get usage statistics (if available)
   * @returns {Promise<Object>} - Usage statistics
   */
  async getUsageStats() {
    try {
      const response = await axios.get('https://api.ocr.space/usage', {
        params: { apikey: this.apiKey },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.warn('Could not fetch usage stats:', error.message);
      return null;
    }
  }
}

module.exports = OCRSpaceService; 
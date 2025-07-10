/**
 * Unified OCR Service Interface
 * 
 * This interface provides a consistent API for different OCR services,
 * abstracting away the differences in credentials, URLs, request/response formats.
 */

class OCRServiceInterface {
  constructor(config = {}) {
    this.config = {
      serviceName: 'unknown',
      timeout: 30000,
      minConfidence: 0.3,
      language: 'deu', // German by default
      ...config
    };
    
    this.isInitialized = false;
  }

  /**
   * Initialize the service with credentials and configuration
   * @param {Object} credentials - Service-specific credentials
   * @returns {Promise<boolean>} - True if initialization successful
   */
  async initialize(credentials) {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Process an image and extract text
   * @param {string|Buffer} imageInput - Image file path or buffer
   * @param {Object} options - Processing options
   * @returns {Promise<OCRResult>} - Standardized OCR result
   */
  async processImage(imageInput, options = {}) {
    throw new Error('processImage() must be implemented by subclass');
  }

  /**
   * Get service status and capabilities
   * @returns {Object} - Service information
   */
  getServiceInfo() {
    return {
      name: this.config.serviceName,
      type: 'unknown', // 'cloud' or 'local'
      isInitialized: this.isInitialized,
      supportsConfidence: false,
      supportsLanguages: [],
      maxFileSize: null,
      supportedFormats: [],
      pricing: {
        freeTier: null,
        costPerRequest: null
      }
    };
  }

  /**
   * Validate if the service can process the given image
   * @param {string|Buffer} imageInput - Image to validate
   * @returns {Object} - Validation result
   */
  validateImage(imageInput) {
    const fs = require('fs');
    const path = require('path');

    try {
      let filePath, fileSize, fileFormat;

      if (typeof imageInput === 'string') {
        // File path
        if (!fs.existsSync(imageInput)) {
          return { valid: false, error: 'File not found' };
        }
        filePath = imageInput;
        fileSize = fs.statSync(imageInput).size;
        fileFormat = path.extname(imageInput).toLowerCase();
      } else if (Buffer.isBuffer(imageInput)) {
        // Buffer
        fileSize = imageInput.length;
        fileFormat = '.jpg'; // Assume JPEG for buffers
      } else {
        return { valid: false, error: 'Invalid image input type' };
      }

      // Check file size
      const maxSize = this.getServiceInfo().maxFileSize;
      if (maxSize && fileSize > maxSize) {
        return { 
          valid: false, 
          error: `File too large: ${fileSize} bytes (max: ${maxSize} bytes)` 
        };
      }

      // Check file format
      const supportedFormats = this.getServiceInfo().supportedFormats;
      if (supportedFormats.length > 0 && !supportedFormats.includes(fileFormat)) {
        return { 
          valid: false, 
          error: `Unsupported format: ${fileFormat} (supported: ${supportedFormats.join(', ')})` 
        };
      }

      return { valid: true, fileSize, fileFormat };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Convert raw OCR result to structured receipt data
   * @param {OCRResult} ocrResult - Raw OCR result
   * @returns {ReceiptData} - Structured receipt information
   */
  extractReceiptData(ocrResult) {
    if (!ocrResult || !ocrResult.text) {
      return {
        retailer: null,
        date: null,
        total: null,
        items: [],
        confidence: ocrResult?.confidence || 0,
        rawText: ocrResult?.text || '',
        errors: ['No text extracted']
      };
    }

    const lines = ocrResult.text.split('\n').filter(line => line.trim());
    const receiptData = {
      retailer: this.extractRetailer(lines),
      date: this.extractDate(lines),
      total: this.extractTotal(lines),
      items: this.extractItems(lines),
      confidence: ocrResult.confidence || 0,
      rawText: ocrResult.text,
      errors: []
    };

    return receiptData;
  }

  /**
   * Extract retailer information from OCR text
   * @param {string[]} lines - Lines of OCR text
   * @returns {Object|null} - Retailer information
   */
  extractRetailer(lines) {
    const retailerPatterns = [
      { name: 'dm', pattern: /dm/i },
      { name: 'EDEKA', pattern: /edeka/i },
      { name: 'REWE', pattern: /rewe/i },
      { name: 'Lidl', pattern: /lidl/i },
      { name: 'Aldi', pattern: /aldi/i },
      { name: 'Kaufland', pattern: /kaufland/i }
    ];

    for (const line of lines) {
      for (const retailer of retailerPatterns) {
        if (retailer.pattern.test(line)) {
          return {
            name: retailer.name,
            fullLine: line.trim(),
            confidence: 0.9
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract date from OCR text
   * @param {string[]} lines - Lines of OCR text
   * @returns {Object|null} - Date information
   */
  extractDate(lines) {
    const datePatterns = [
      /\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/, // DD.MM.YYYY or DD/MM/YYYY
      /\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}/,   // YYYY.MM.DD or YYYY/MM/DD
      /\d{1,2}:\d{2}/                       // HH:MM time
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          return {
            value: match[0],
            fullLine: line.trim(),
            confidence: 0.8
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract total amount from OCR text
   * @param {string[]} lines - Lines of OCR text
   * @returns {Object|null} - Total amount information
   */
  extractTotal(lines) {
    const totalPatterns = [
      /(?:summe|total|gesamt)\s*(?:eur)?\s*(\d+[,.]?\d*)/i,
      /(\d+[,.]?\d*)\s*€\s*(?:summe|total|gesamt)/i,
      /(?:summe|total|gesamt)\s*(\d+[,.]?\d*)/i
    ];

    for (const line of lines) {
      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1].replace(',', '.'));
          return {
            amount: amount,
            currency: 'EUR',
            fullLine: line.trim(),
            confidence: 0.9
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract items from OCR text
   * @param {string[]} lines - Lines of OCR text
   * @returns {Array} - Array of item objects
   */
  extractItems(lines) {
    const items = [];
    const pricePattern = /\d+[,.]?\d*\s*€/;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip lines that are likely not items
      if (this.isLikelyNotItem(trimmedLine)) continue;
      
      // Check if line contains a price
      if (pricePattern.test(trimmedLine)) {
        const item = this.parseItemLine(trimmedLine);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Check if a line is likely not an item
   * @param {string} line - Line to check
   * @returns {boolean} - True if likely not an item
   */
  isLikelyNotItem(line) {
    const notItemPatterns = [
      /^(?:summe|total|gesamt)/i,
      /^(?:dm|edeka|rewe|lidl|aldi)/i,
      /^\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/, // Date
      /^\d{1,2}:\d{2}/, // Time
      /^(?:tel|phone|straße|str\.)/i,
      /^(?:mwst|vat|tax)/i,
      /^€\s*$/, // Just euro symbol
      /^[A-Z\s]+$/, // All caps (likely header)
      /^\s*$/, // Empty or whitespace only
      /^[0-9\s]+$/ // Just numbers and spaces
    ];

    return notItemPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Parse a single item line
   * @param {string} line - Item line to parse
   * @returns {Object|null} - Parsed item or null
   */
  parseItemLine(line) {
    // Extract price
    const priceMatch = line.match(/(\d+[,.]?\d*)\s*€/);
    if (!priceMatch) return null;

    const price = parseFloat(priceMatch[1].replace(',', '.'));
    
    // Extract quantity if present
    const quantityMatch = line.match(/(\d+)\s*x\s*/i);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
    
    // Extract product name (everything before the price)
    const beforePrice = line.substring(0, line.indexOf(priceMatch[0])).trim();
    const productName = beforePrice.replace(/^\d+\s*x\s*/i, '').trim();
    
    if (!productName) return null;

    return {
      name: productName,
      price: price,
      quantity: quantity,
      totalPrice: price * quantity,
      confidence: 0.7
    };
  }
}

/**
 * Standard OCR Result format
 * @typedef {Object} OCRResult
 * @property {string} text - Extracted text
 * @property {number} confidence - Confidence score (0-1)
 * @property {Object} processing_info - Processing metadata
 * @property {Object} raw_result - Original service response
 */

/**
 * Structured receipt data format
 * @typedef {Object} ReceiptData
 * @property {Object|null} retailer - Retailer information
 * @property {Object|null} date - Date information
 * @property {Object|null} total - Total amount
 * @property {Array} items - Array of items
 * @property {number} confidence - Overall confidence
 * @property {string} rawText - Raw OCR text
 * @property {Array} errors - Any errors encountered
 */

module.exports = OCRServiceInterface; 
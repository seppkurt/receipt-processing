const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');
const OCRServiceInterface = require('./ocr-interface');

class TesseractOCRService extends OCRServiceInterface {
  constructor(config = {}) {
    super({
      serviceName: 'tesseract',
      timeout: 30000,
      minConfidence: 0.3,
      language: 'deu+eng',
      ...config
    });
    
    console.log('🔍 Tesseract.js OCR service initialized (local processing)');
    this.isInitialized = true; // Tesseract doesn't need initialization
  }

  async initialize(credentials) {
    // Tesseract doesn't require credentials
    this.isInitialized = true;
    return true;
  }

  async processImage(imageInput, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Tesseract service not initialized.');
    }

    try {
      // Validate input
      const validation = this.validateImage(imageInput);
      if (!validation.valid) {
        throw new Error(`Image validation failed: ${validation.error}`);
      }

      console.log('🔍 Processing with Tesseract.js...');
      
      let imagePath;
      let fileName = 'image.jpg';

      if (typeof imageInput === 'string') {
        // File path
        imagePath = imageInput;
        fileName = path.basename(imageInput);
        console.log('📁 Image:', fileName);
      } else if (Buffer.isBuffer(imageInput)) {
        // For buffers, we need to save to temp file
        const tempPath = path.join(__dirname, '../../temp_image.jpg');
        fs.writeFileSync(tempPath, imageInput);
        imagePath = tempPath;
        console.log('📁 Image: Buffer input (saved to temp file)');
      } else {
        throw new Error('Invalid image input type');
      }

      // Process with Tesseract
      const result = await Tesseract.recognize(
        imagePath,
        options.language || this.config.language,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`⏳ Progress: ${(m.progress * 100).toFixed(1)}%`);
            }
          }
        }
      );

      const text = result.data.text;
      const confidence = result.data.confidence / 100; // Convert to 0-1 scale

      console.log('✅ Tesseract processing completed');
      console.log('📄 Text length:', text.length);
      console.log('🎯 Confidence:', (confidence * 100).toFixed(1) + '%');

      return {
        text: text.trim(),
        confidence: confidence,
        raw_result: result,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'Tesseract.js',
          model: 'Local OCR',
          language: options.language || this.config.language,
          fileName: fileName
        }
      };

    } catch (error) {
      console.error('❌ Tesseract processing error:', error.message);
      throw error;
    }
  }

  // Convert Tesseract result to markdown format
  convertToMarkdown(tesseractResult) {
    if (!tesseractResult.text) {
      return '# Receipt\n\nNo text detected in image.';
    }

    const lines = tesseractResult.text.split('\n').filter(line => line.trim());
    
    let markdown = '# Receipt\n\n';
    
    // Try to identify sections and format them
    let inItemsSection = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;
      
      // Try to identify common receipt patterns
      if (this.isTotalLine(trimmedLine)) {
        markdown += `## Total\n\n* **${trimmedLine}**\n\n`;
      } else if (this.isDateLine(trimmedLine)) {
        markdown += `## Date and Time\n\n* **${trimmedLine}**\n\n`;
      } else if (this.isStoreLine(trimmedLine)) {
        markdown += `## Store Information\n\n* **${trimmedLine}**\n\n`;
      } else if (this.isItemLine(trimmedLine)) {
        if (!inItemsSection) {
          markdown += '## Items Purchased\n\n| Item | Quantity | Price |\n| --- | --- | --- |\n';
          inItemsSection = true;
        }
        markdown += `| ${trimmedLine} | | |\n`;
      } else {
        // Default formatting
        markdown += `* ${trimmedLine}\n`;
      }
    }
    
    return markdown;
  }

  isTotalLine(line) {
    const totalPatterns = [
      /total/i, /summe/i, /gesamt/i, /€\s*\d+[,.]?\d*/, /\d+[,.]?\d*\s*€/
    ];
    return totalPatterns.some(pattern => pattern.test(line));
  }

  isDateLine(line) {
    const datePatterns = [
      /\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/,
      /\d{1,2}:\d{2}/
    ];
    return datePatterns.some(pattern => pattern.test(line));
  }

  isStoreLine(line) {
    const storePatterns = [
      /edeka/i, /dm/i, /rewe/i, /lidl/i, /aldi/i, /kaufland/i,
      /str\./i, /straße/i, /straße/i, /tel/i, /phone/i
    ];
    return storePatterns.some(pattern => pattern.test(line));
  }

  isItemLine(line) {
    // Simple heuristic: lines with prices are likely items
    const pricePattern = /\d+[,.]?\d*\s*€/;
    return pricePattern.test(line) && line.length > 5;
  }

  // Get available languages
  async getAvailableLanguages() {
    try {
      const languages = await Tesseract.getLanguages();
      return languages;
    } catch (error) {
      console.error('❌ Error getting languages:', error.message);
      return ['eng']; // Default to English
    }
  }

  // Set custom configuration
  async processImageWithConfig(imagePath, config = {}) {
    const defaultConfig = {
      lang: 'deu+eng',
      oem: 3, // OCR Engine Mode: Default
      psm: 6, // Page Segmentation Mode: Uniform block of text
      ...config
    };

    try {
      console.log('🔍 Processing with custom Tesseract configuration...');
      
      const result = await Tesseract.recognize(
        imagePath,
        defaultConfig.lang,
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`⏳ Progress: ${(m.progress * 100).toFixed(1)}%`);
            }
          },
          ...defaultConfig
        }
      );

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100,
        raw_result: result,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'Tesseract.js',
          model: 'Local OCR with custom config',
          language: defaultConfig.lang
        }
      };

    } catch (error) {
      console.error('❌ Tesseract custom processing error:', error.message);
      throw error;
    }
  }

  /**
   * Get service status and capabilities
   * @returns {Object} - Service information
   */
  getServiceInfo() {
    return {
      name: this.config.serviceName,
      type: 'local',
      isInitialized: this.isInitialized,
      supportsConfidence: true,
      supportsLanguages: ['eng', 'deu', 'fra', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'chi_tra', 'jpn', 'kor'],
      maxFileSize: 50 * 1024 * 1024, // 50MB (local processing)
      supportedFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
      pricing: {
        freeTier: 'Unlimited',
        costPerRequest: 0 // Free
      },
      features: [
        'Local processing (no network required)',
        'Privacy-friendly',
        'Multiple language support',
        'Confidence scoring',
        'Custom configuration options'
      ]
    };
  }
}

module.exports = TesseractOCRService; 
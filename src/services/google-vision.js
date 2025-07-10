const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

class GoogleVisionService {
  constructor() {
    // Initialize the client with credentials from google_keys directory
    const credentialsPath = path.join(__dirname, '../../google_keys/receipt-processing-465420-1d034c991c6b.json');
    
    if (fs.existsSync(credentialsPath)) {
      this.client = new vision.ImageAnnotatorClient({
        keyFilename: credentialsPath
      });
      console.log('🔍 Google Cloud Vision service initialized with credentials from:', credentialsPath);
    } else {
      // Fallback to environment variable if credentials file not found
      this.client = new vision.ImageAnnotatorClient();
      console.log('🔍 Google Cloud Vision service initialized (using environment credentials)');
    }
  }

  async processImage(imagePath) {
    try {
      console.log('🔍 Processing with Google Cloud Vision...');
      console.log('📁 Image:', path.basename(imagePath));

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Perform text detection
      const [result] = await this.client.textDetection(imageBuffer);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        console.log('❌ No text detected in image');
        return {
          text: '',
          confidence: 0,
          error: 'No text detected'
        };
      }

      // The first element contains the entire text
      const fullText = detections[0].description;
      
      // Calculate average confidence from all detected text blocks
      const confidenceScores = detections.slice(1).map(detection => 
        detection.confidence || 0
      );
      const avgConfidence = confidenceScores.length > 0 
        ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length 
        : 0;

      console.log('✅ Google Vision processing completed');
      console.log('📄 Text length:', fullText.length);
      console.log('🎯 Average confidence:', (avgConfidence * 100).toFixed(1) + '%');

      return {
        text: fullText,
        confidence: avgConfidence,
        raw_detections: detections,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'Google Cloud Vision',
          model: 'OCR API v1'
        }
      };

    } catch (error) {
      console.error('❌ Google Vision processing error:', error.message);
      throw error;
    }
  }

  // Convert Google Vision result to markdown format (similar to Llama OCR output)
  convertToMarkdown(googleResult) {
    if (!googleResult.text) {
      return '# Receipt\n\nNo text detected in image.';
    }

    const lines = googleResult.text.split('\n').filter(line => line.trim());
    
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
}

module.exports = GoogleVisionService; 
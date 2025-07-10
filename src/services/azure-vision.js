const ComputerVisionClient = require('@azure/cognitiveservices-computervision').ComputerVisionClient;
const ApiKeyCredentials = require('@azure/ms-rest-js').ApiKeyCredentials;
const fs = require('fs');
const path = require('path');

class AzureVisionService {
  constructor() {
    // Initialize Azure Computer Vision client
    const subscriptionKey = process.env.AZURE_VISION_KEY;
    const endpoint = process.env.AZURE_VISION_ENDPOINT;
    
    if (!subscriptionKey || !endpoint) {
      console.log('⚠️  Azure Vision credentials not found in environment variables');
      console.log('   Set AZURE_VISION_KEY and AZURE_VISION_ENDPOINT');
      return;
    }
    
    this.client = new ComputerVisionClient(
      new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': subscriptionKey } }),
      endpoint
    );
    
    console.log('🔍 Azure Computer Vision service initialized');
  }

  async processImage(imagePath) {
    try {
      console.log('🔍 Processing with Azure Computer Vision...');
      console.log('📁 Image:', path.basename(imagePath));

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error('Image file not found');
      }

      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Perform OCR
      const result = await this.client.recognizePrintedTextInStream(false, imageBuffer);
      
      if (!result.regions || result.regions.length === 0) {
        console.log('❌ No text detected in image');
        return {
          text: '',
          confidence: 0,
          error: 'No text detected'
        };
      }

      // Extract text from all regions
      let fullText = '';
      let totalConfidence = 0;
      let confidenceCount = 0;

      for (const region of result.regions) {
        for (const line of region.lines) {
          for (const word of line.words) {
            fullText += word.text + ' ';
            if (word.confidence) {
              totalConfidence += word.confidence;
              confidenceCount++;
            }
          }
          fullText += '\n';
        }
      }

      const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

      console.log('✅ Azure Vision processing completed');
      console.log('📄 Text length:', fullText.length);
      console.log('🎯 Average confidence:', (avgConfidence * 100).toFixed(1) + '%');

      return {
        text: fullText.trim(),
        confidence: avgConfidence,
        raw_result: result,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'Azure Computer Vision',
          model: 'OCR API v3.2'
        }
      };

    } catch (error) {
      console.error('❌ Azure Vision processing error:', error.message);
      throw error;
    }
  }

  async processReceipt(imagePath) {
    try {
      console.log('🧾 Processing receipt with Azure Computer Vision...');
      
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      
      // Use receipt understanding API (if available)
      // Note: This requires a different endpoint and may have additional costs
      const result = await this.client.analyzeImageInStream(imageBuffer, {
        visualFeatures: ['Text'],
        language: 'de' // German language
      });
      
      // Extract text from the result
      let fullText = '';
      if (result.text && result.text.regions) {
        for (const region of result.text.regions) {
          for (const line of region.lines) {
            for (const word of line.words) {
              fullText += word.text + ' ';
            }
            fullText += '\n';
          }
        }
      }

      return {
        text: fullText.trim(),
        confidence: 0.9, // Azure doesn't provide confidence scores for this endpoint
        raw_result: result,
        processing_info: {
          timestamp: new Date().toISOString(),
          service: 'Azure Computer Vision',
          model: 'Receipt Understanding API'
        }
      };

    } catch (error) {
      console.error('❌ Azure Receipt processing error:', error.message);
      // Fallback to regular OCR
      return this.processImage(imagePath);
    }
  }

  // Convert Azure Vision result to markdown format
  convertToMarkdown(azureResult) {
    if (!azureResult.text) {
      return '# Receipt\n\nNo text detected in image.';
    }

    const lines = azureResult.text.split('\n').filter(line => line.trim());
    
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

module.exports = AzureVisionService; 
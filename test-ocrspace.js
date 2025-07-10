const OCRSpaceService = require('./src/services/ocrspace-service');
const path = require('path');

async function testOCRSpace() {
  try {
    console.log('🧪 Testing OCR.space Service...\n');
    
    // Initialize OCR.space service
    const ocrSpace = new OCRSpaceService({
      timeout: 30000,
      minConfidence: 0.3,
      language: 'ger' // German
    });
    
    // Show service info
    console.log('📊 Service Information:');
    const serviceInfo = ocrSpace.getServiceInfo();
    Object.entries(serviceInfo).forEach(([key, value]) => {
      if (key === 'features') {
        console.log(`   ${key}: ${value.join(', ')}`);
      } else if (key === 'pricing') {
        console.log(`   ${key}: ${value.freeTier} (${value.costPerRequest}$ per request)`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    });
    console.log('');
    
    // Show available engines
    console.log('🔧 Available OCR Engines:');
    const engines = ocrSpace.getAvailableEngines();
    engines.forEach(engine => {
      console.log(`   ${engine.id}. ${engine.name}: ${engine.description}`);
    });
    console.log('');
    
    // Get API key from environment or prompt
    const apiKey = process.env.OCRSPACE_API_KEY;
    if (!apiKey) {
      console.log('❌ OCR.space API key not found in environment');
      console.log('Please set OCRSPACE_API_KEY environment variable');
      console.log('Or get a free API key from: https://ocr.space/ocrapi');
      return;
    }
    
    // Initialize the service
    console.log('🔑 Initializing OCR.space service...');
    const initialized = await ocrSpace.initialize({ apiKey });
    
    if (!initialized) {
      console.log('❌ Failed to initialize OCR.space service');
      return;
    }
    
    // Test with a sample image
    const testImagePath = process.argv[2];
    
    if (!testImagePath) {
      console.log('❌ Please provide an image path as argument');
      console.log('Usage: node test-ocrspace.js <path-to-image>');
      console.log('Example: node test-ocrspace.js images/test/dm_1.jpg');
      return;
    }
    
    if (!require('fs').existsSync(testImagePath)) {
      console.log('❌ Image file not found:', testImagePath);
      return;
    }
    
    // Validate image
    console.log('🔍 Validating image...');
    const validation = ocrSpace.validateImage(testImagePath);
    if (!validation.valid) {
      console.log('❌ Image validation failed:', validation.error);
      return;
    }
    console.log('✅ Image validation passed');
    console.log(`   File size: ${(validation.fileSize / 1024).toFixed(1)} KB`);
    console.log(`   Format: ${validation.fileFormat}`);
    console.log('');
    
    console.log('📁 Testing with image:', path.basename(testImagePath));
    console.log('⏳ Processing...\n');
    
    // Process the image
    const result = await ocrSpace.processImage(testImagePath, {
      ocrEngine: 2, // Use OCR Engine 2 for better accuracy
      scale: true,
      detectOrientation: true
    });
    
    console.log('\n📊 OCR Results:');
    console.log('='.repeat(50));
    console.log('Text Length:', result.text.length, 'characters');
    console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('Processing Info:', result.processing_info);
    
    if (result.error) {
      console.log('Error:', result.error);
    }
    
    console.log('\nRaw Text (first 500 characters):');
    console.log(result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''));
    console.log('\n' + '='.repeat(50));
    
    // Extract structured receipt data
    console.log('🧾 Extracting Receipt Data:');
    console.log('='.repeat(50));
    const receiptData = ocrSpace.extractReceiptData(result);
    
    console.log('Retailer:', receiptData.retailer ? receiptData.retailer.name : 'Not detected');
    console.log('Date:', receiptData.date ? receiptData.date.value : 'Not detected');
    console.log('Total:', receiptData.total ? `${receiptData.total.amount} ${receiptData.total.currency}` : 'Not detected');
    console.log('Items found:', receiptData.items.length);
    
    if (receiptData.items.length > 0) {
      console.log('\nItems:');
      receiptData.items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} - ${item.price}€ x${item.quantity} = ${item.totalPrice}€`);
      });
    }
    
    if (receiptData.errors.length > 0) {
      console.log('\nErrors:', receiptData.errors);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Try to get usage stats
    console.log('📈 Usage Statistics:');
    try {
      const usageStats = await ocrSpace.getUsageStats();
      if (usageStats) {
        console.log('Usage stats:', usageStats);
      } else {
        console.log('Usage stats not available');
      }
    } catch (error) {
      console.log('Could not fetch usage stats:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n🔑 Authentication Error:');
      console.log('1. Get a free API key from: https://ocr.space/ocrapi');
      console.log('2. Set environment variable: export OCRSPACE_API_KEY="your-api-key"');
      console.log('3. Or pass it directly in the code');
    }
  }
}

testOCRSpace(); 
const OCRServiceFactory = require('./src/services/ocr-factory');
const path = require('path');
const fs = require('fs');

async function testUnifiedOCR() {
  try {
    console.log('🧪 Testing Unified OCR Architecture...\n');
    
    // Initialize the factory
    const factory = new OCRServiceFactory();
    
    // Show available services
    console.log('📊 Available OCR Services:');
    const availableServices = factory.getAvailableServices();
    Object.entries(availableServices).forEach(([key, service]) => {
      const statusIcon = service.requiresCredentials ? '🔑' : '🆓';
      console.log(`   ${statusIcon} ${key}: ${service.name} (${service.type})`);
      console.log(`      ${service.description}`);
    });
    console.log('');
    
    // Test with a sample image
    const testImagePath = process.argv[2];
    
    if (!testImagePath) {
      console.log('❌ Please provide an image path as argument');
      console.log('Usage: node test-unified-ocr.js <path-to-image>');
      console.log('Example: node test-unified-ocr.js images/test/dm_1.jpg');
      return;
    }
    
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Image file not found:', testImagePath);
      return;
    }
    
    console.log('📁 Testing with image:', path.basename(testImagePath));
    console.log('');
    
    // Test different services
    const servicesToTest = ['tesseract', 'ocrspace']; // Start with free services
    
    // Add Google Cloud Vision if credentials are available
    if (fs.existsSync('./google_keys/receipt-processing-465420-1d034c991c6b.json')) {
      servicesToTest.push('google');
    }
    
    // Add Azure if credentials are available
    if (process.env.AZURE_VISION_KEY && process.env.AZURE_VISION_ENDPOINT) {
      servicesToTest.push('azure');
    }
    
    console.log(`🔧 Testing services: ${servicesToTest.join(', ')}\n`);
    
    // Prepare credentials
    const credentials = {
      google: {
        keyFilename: './google_keys/receipt-processing-465420-1d034c991c6b.json'
      },
      azure: {
        subscriptionKey: process.env.AZURE_VISION_KEY,
        endpoint: process.env.AZURE_VISION_ENDPOINT
      },
      ocrspace: {
        apiKey: process.env.OCRSPACE_API_KEY
      }
    };
    
    // Create services
    console.log('🔧 Creating services...');
    const { services, errors } = await factory.createMultipleServices(
      servicesToTest,
      { timeout: 30000, minConfidence: 0.3 },
      credentials
    );
    
    if (errors.length > 0) {
      console.log('⚠️  Service creation errors:');
      errors.forEach(error => {
        console.log(`   ${error.service}: ${error.error}`);
      });
      console.log('');
    }
    
    if (Object.keys(services).length === 0) {
      console.log('❌ No services could be created');
      return;
    }
    
    console.log(`✅ Created ${Object.keys(services).length} services\n`);
    
    // Test each service
    const results = {};
    
    for (const [serviceName, service] of Object.entries(services)) {
      try {
        console.log(`🔍 Testing ${serviceName}...`);
        
        // Get service info
        const serviceInfo = service.getServiceInfo();
        console.log(`   Type: ${serviceInfo.type}`);
        console.log(`   Max file size: ${serviceInfo.maxFileSize ? (serviceInfo.maxFileSize / 1024 / 1024).toFixed(1) + 'MB' : 'Unknown'}`);
        console.log(`   Supported formats: ${serviceInfo.supportedFormats.join(', ')}`);
        
        // Validate image
        const validation = service.validateImage(testImagePath);
        if (!validation.valid) {
          console.log(`   ❌ Image validation failed: ${validation.error}`);
          continue;
        }
        
        // Process image
        const startTime = Date.now();
        const ocrResult = await service.processImage(testImagePath);
        const processingTime = Date.now() - startTime;
        
        // Extract structured data
        const receiptData = service.extractReceiptData(ocrResult);
        
        results[serviceName] = {
          ocrResult,
          receiptData,
          processingTime,
          serviceInfo
        };
        
        console.log(`   ✅ Completed in ${processingTime}ms`);
        console.log(`   📄 Text length: ${ocrResult.text.length} characters`);
        console.log(`   🎯 Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);
        console.log(`   🏪 Retailer: ${receiptData.retailer ? receiptData.retailer.name : 'Not detected'}`);
        console.log(`   📅 Date: ${receiptData.date ? receiptData.date.value : 'Not detected'}`);
        console.log(`   💰 Total: ${receiptData.total ? `${receiptData.total.amount} ${receiptData.total.currency}` : 'Not detected'}`);
        console.log(`   🛒 Items: ${receiptData.items.length}`);
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}\n`);
        results[serviceName] = { error: error.message };
      }
    }
    
    // Compare results
    console.log('📊 Results Comparison:');
    console.log('='.repeat(80));
    
    const comparisonTable = [];
    comparisonTable.push(['Service', 'Text Length', 'Confidence', 'Retailer', 'Date', 'Total', 'Items', 'Time(ms)']);
    comparisonTable.push(['-------', '-----------', '----------', '--------', '----', '-----', '-----', '-------']);
    
    for (const [serviceName, result] of Object.entries(results)) {
      if (result.error) {
        comparisonTable.push([serviceName, 'ERROR', 'ERROR', 'ERROR', 'ERROR', 'ERROR', 'ERROR', 'ERROR']);
      } else {
        const { ocrResult, receiptData, processingTime } = result;
        comparisonTable.push([
          serviceName,
          ocrResult.text.length.toString(),
          `${(ocrResult.confidence * 100).toFixed(1)}%`,
          receiptData.retailer ? receiptData.retailer.name : 'None',
          receiptData.date ? receiptData.date.value : 'None',
          receiptData.total ? `${receiptData.total.amount}€` : 'None',
          receiptData.items.length.toString(),
          processingTime.toString()
        ]);
      }
    }
    
    // Print comparison table
    comparisonTable.forEach(row => {
      console.log(`| ${row.map(cell => cell.padEnd(12)).join(' | ')} |`);
    });
    
    console.log('='.repeat(80));
    
    // Show detailed results for each service
    console.log('\n📋 Detailed Results:');
    for (const [serviceName, result] of Object.entries(results)) {
      if (result.error) {
        console.log(`\n❌ ${serviceName}: ${result.error}`);
        continue;
      }
      
      console.log(`\n✅ ${serviceName.toUpperCase()}:`);
      console.log('-'.repeat(40));
      console.log('Raw Text (first 300 characters):');
      console.log(result.ocrResult.text.substring(0, 300) + (result.ocrResult.text.length > 300 ? '...' : ''));
      
      if (result.receiptData.items.length > 0) {
        console.log('\nItems:');
        result.receiptData.items.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.name} - ${item.price}€ x${item.quantity} = ${item.totalPrice}€`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUnifiedOCR(); 
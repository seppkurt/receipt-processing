const MultiOCRService = require('./src/services/multi-ocr');
const path = require('path');

async function testMultiOCR() {
  try {
    console.log('🧪 Testing Multi-OCR Service...\n');
    
    // Initialize multi-OCR service
    const multiOCR = new MultiOCRService({
      primary: 'google',
      fallback: 'tesseract',
      timeout: 30000,
      minConfidence: 0.3
    });
    
    // Show service status
    console.log('📊 Service Status:');
    const status = multiOCR.getServiceStatus();
    Object.entries(status).forEach(([service, info]) => {
      const statusIcon = info.available ? '✅' : '❌';
      console.log(`   ${statusIcon} ${service}: ${info.type} - ${info.description}`);
    });
    console.log('');
    
    // Show configuration
    console.log('⚙️  Configuration:');
    const stats = multiOCR.getStats();
    console.log(`   Primary Service: ${stats.primary_service}`);
    console.log(`   Fallback Service: ${stats.fallback_service}`);
    console.log(`   Timeout: ${stats.timeout}ms`);
    console.log(`   Min Confidence: ${(stats.min_confidence * 100).toFixed(1)}%`);
    console.log('');
    
    // Test with a sample image
    const testImagePath = process.argv[2];
    
    if (!testImagePath) {
      console.log('❌ Please provide an image path as argument');
      console.log('Usage: node test-multi-ocr.js <path-to-image>');
      console.log('Example: node test-multi-ocr.js images/test/dm_1.jpg');
      return;
    }
    
    if (!require('fs').existsSync(testImagePath)) {
      console.log('❌ Image file not found:', testImagePath);
      return;
    }
    
    console.log('📁 Testing with image:', path.basename(testImagePath));
    console.log('⏳ Processing...\n');
    
    // Process the image
    const result = await multiOCR.processImage(testImagePath);
    
    console.log('\n📊 Results:');
    console.log('='.repeat(50));
    console.log('Service Used:', result.service_used);
    console.log('Fallback Used:', result.fallback_used ? 'Yes' : 'No');
    console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
    console.log('Text Length:', result.text.length, 'characters');
    console.log('\nRaw Text (first 500 characters):');
    console.log(result.text.substring(0, 500) + (result.text.length > 500 ? '...' : ''));
    console.log('\n' + '='.repeat(50));
    
    // Convert to markdown
    const markdown = multiOCR.convertToMarkdown(result);
    console.log('Markdown Format (first 800 characters):');
    console.log(markdown.substring(0, 800) + (markdown.length > 800 ? '...' : ''));
    console.log('\n' + '='.repeat(50));
    
    console.log('Processing Info:', result.processing_info);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n🔑 Authentication Error:');
      console.log('Check that your service credentials are properly configured');
    }
  }
}

testMultiOCR(); 
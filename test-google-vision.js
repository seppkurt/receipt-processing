const GoogleVisionService = require('./src/services/google-vision');
const path = require('path');

async function testGoogleVision() {
  try {
    console.log('🧪 Testing Google Cloud Vision API...\n');
    
    // Initialize the service
    const googleVision = new GoogleVisionService();
    
    // Test with a sample image (you'll need to provide one)
    const testImagePath = process.argv[2];
    
    if (!testImagePath) {
      console.log('❌ Please provide an image path as argument');
      console.log('Usage: node test-google-vision.js <path-to-image>');
      console.log('Example: node test-google-vision.js images/test-receipt.jpg');
      return;
    }
    
    if (!require('fs').existsSync(testImagePath)) {
      console.log('❌ Image file not found:', testImagePath);
      return;
    }
    
    console.log('📁 Testing with image:', testImagePath);
    console.log('⏳ Processing...\n');
    
    // Process the image
    const result = await googleVision.processImage(testImagePath);
    
    console.log('\n📊 Results:');
    console.log('='.repeat(50));
    console.log('Raw Text:');
    console.log(result.text);
    console.log('\n' + '='.repeat(50));
    
    // Convert to markdown
    const markdown = googleVision.convertToMarkdown(result);
    console.log('Markdown Format:');
    console.log(markdown);
    console.log('\n' + '='.repeat(50));
    
    console.log('Processing Info:', result.processing_info);
    console.log('Confidence:', (result.confidence * 100).toFixed(1) + '%');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n🔑 Authentication Error:');
      console.log('You need to set up Google Cloud credentials:');
      console.log('1. Create a service account in Google Cloud Console');
      console.log('2. Download the JSON key file');
      console.log('3. Set environment variable:');
      console.log('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key.json"');
      console.log('4. Or place the key file in the project and update the service');
    }
  }
}

testGoogleVision(); 
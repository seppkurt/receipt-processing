const fs = require('fs');
const path = require('path');

// Test the API endpoint directly
async function testAPI() {
  console.log('🧪 Testing API endpoint...');
  
  // Use a test image from the images directory
  const testImagePath = path.join(__dirname, 'images', '332061.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    return;
  }
  
  console.log('📁 Using test image:', testImagePath);
  
  // Create form data
  const FormData = require('form-data');
  const form = new FormData();
  form.append('receipt', fs.createReadStream(testImagePath), {
    filename: 'test-receipt.jpg',
    contentType: 'image/jpeg'
  });
  
  try {
    const headers = form.getHeaders();
    const response = await fetch('http://localhost:3000/api/process-receipt', {
      method: 'POST',
      body: form,
      headers
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ API Response received successfully');
    console.log('📄 Response structure:');
    console.log('- Has receipt:', !!result.receipt);
    console.log('- Has ocr_data:', !!result.ocr_data);
    console.log('- Has processing_info:', !!result.processing_info);
    
    if (result.receipt) {
      console.log('📋 Receipt data:');
      console.log('- Store:', result.receipt.store?.name);
      console.log('- Items count:', result.receipt.items?.length || 0);
      console.log('- Total amount:', result.receipt.totals?.total_amount);
    }
    
    if (result.ocr_data) {
      console.log('🔍 OCR data:');
      console.log('- Raw markdown length:', result.ocr_data.raw_markdown?.length || 0);
      console.log('- Raw markdown preview:', result.ocr_data.raw_markdown?.substring(0, 200) + '...');
    }
    
    // Test if the response is valid JSON for frontend
    const jsonString = JSON.stringify(result);
    console.log('📏 JSON size:', jsonString.length, 'bytes');
    
    // Check for any potential issues
    if (jsonString.includes('undefined')) {
      console.warn('⚠️  Warning: Response contains undefined values');
    }
    
    if (jsonString.includes('null')) {
      console.log('ℹ️  Response contains null values (this is normal)');
    }
    
    console.log('✅ API test completed successfully');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Run the test
testAPI(); 
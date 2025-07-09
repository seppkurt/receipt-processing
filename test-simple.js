const fs = require('fs');
const path = require('path');

// Simple test using curl command
async function testWithCurl() {
  console.log('🧪 Testing API with curl...');
  
  const testImagePath = path.join(__dirname, 'images', '332061.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    return;
  }
  
  console.log('📁 Using test image:', testImagePath);
  
  // Use curl to test the API
  const curlCommand = `curl -X POST http://localhost:3000/api/process-receipt \
    -F "receipt=@${testImagePath}" \
    -H "Content-Type: multipart/form-data"`;
  
  console.log('🔧 Running curl command...');
  
  const { exec } = require('child_process');
  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Curl error:', error.message);
      return;
    }
    
    if (stderr) {
      console.error('⚠️  Curl stderr:', stderr);
    }
    
    console.log('📊 Response:');
    console.log(stdout);
    
    try {
      const result = JSON.parse(stdout);
      console.log('✅ Successfully parsed JSON response');
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
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError.message);
      console.log('Raw response:', stdout);
    }
  });
}

// Test with a simple HTTP request
async function testWithHTTP() {
  console.log('\n🧪 Testing API with simple HTTP request...');
  
  const testImagePath = path.join(__dirname, 'images', '332061.jpg');
  
  if (!fs.existsSync(testImagePath)) {
    console.error('❌ Test image not found:', testImagePath);
    return;
  }
  
  // Read the image file
  const imageBuffer = fs.readFileSync(testImagePath);
  
  // Create boundary for multipart form data
  const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);
  
  // Build multipart form data manually
  let body = '';
  body += `--${boundary}\r\n`;
  body += 'Content-Disposition: form-data; name="receipt"; filename="test-receipt.jpg"\r\n';
  body += 'Content-Type: image/jpeg\r\n\r\n';
  
  const formData = Buffer.concat([
    Buffer.from(body, 'utf8'),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
  ]);
  
  // Make HTTP request
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/process-receipt',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': formData.length
    }
  };
  
  const req = http.request(options, (res) => {
    console.log('📊 Response status:', res.statusCode);
    console.log('📊 Response headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const result = JSON.parse(data);
          console.log('✅ Successfully received JSON response');
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
          
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response:', parseError.message);
          console.log('Raw response:', data);
        }
      } else {
        console.error('❌ HTTP Error:', res.statusCode);
        console.log('Response:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });
  
  req.write(formData);
  req.end();
}

// Run both tests
testWithCurl();
setTimeout(testWithHTTP, 2000); // Wait 2 seconds before second test 
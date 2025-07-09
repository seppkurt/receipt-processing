const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

const TEST_IMAGES = [
    'images/test/edeka_1.jpg',
    'images/test/edeka_2.jpg', 
    'images/test/dm_1.jpg'
];

async function processReceipt(imagePath) {
    console.log(`\n🔄 Processing: ${path.basename(imagePath)}`);
    
    if (!fs.existsSync(imagePath)) {
        console.log(`❌ Image not found: ${imagePath}`);
        return null;
    }

    try {
        const form = new FormData();
        form.append('receipt', fs.createReadStream(imagePath));

        const response = await fetch('http://localhost:3000/api/process-receipt', {
            method: 'POST',
            body: form
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Success! Receipt ID: ${result.receipt_id}`);
            console.log(`📊 Items extracted: ${result.receipt.items?.length || 0}`);
            console.log(`💰 Total amount: ${result.receipt.totals?.total_amount || 'N/A'}`);
            console.log(`🏪 Store: ${result.receipt.store?.name || 'Unknown'}`);
            return result;
        } else {
            console.log(`❌ Error: ${result.error}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 Starting test with 3 receipt images...');
    console.log('📁 Test images:', TEST_IMAGES.map(img => path.basename(img)).join(', '));
    
    const results = [];
    
    for (const imagePath of TEST_IMAGES) {
        const result = await processReceipt(imagePath);
        if (result) {
            results.push({
                image: path.basename(imagePath),
                receipt_id: result.receipt_id,
                items_count: result.receipt.items?.length || 0,
                total_amount: result.receipt.totals?.total_amount,
                store: result.receipt.store?.name
            });
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📋 Summary of Results:');
    console.log('='.repeat(50));
    
    if (results.length > 0) {
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.image}`);
            console.log(`   Receipt ID: ${result.receipt_id}`);
            console.log(`   Items: ${result.items_count}`);
            console.log(`   Total: ${result.total_amount || 'N/A'}`);
            console.log(`   Store: ${result.store || 'Unknown'}`);
            console.log('');
        });
        
        const totalItems = results.reduce((sum, r) => sum + r.items_count, 0);
        const totalAmount = results.reduce((sum, r) => sum + (r.total_amount || 0), 0);
        
        console.log('📊 Totals:');
        console.log(`   Receipts processed: ${results.length}`);
        console.log(`   Total items: ${totalItems}`);
        console.log(`   Total amount: €${totalAmount.toFixed(2)}`);
        console.log(`   Average per receipt: €${(totalAmount / results.length).toFixed(2)}`);
    } else {
        console.log('❌ No receipts were processed successfully');
    }
    
    console.log('\n🌐 You can now view the results at:');
    console.log('   http://localhost:3000/receipts');
}

// Check if server is running
async function checkServer() {
    try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        if (data.status === 'OK') {
            return true;
        }
    } catch (error) {
        return false;
    }
    return false;
}

async function start() {
    console.log('🔍 Checking if server is running...');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   npm start');
        process.exit(1);
    }
    
    console.log('✅ Server is running!');
    await main();
}

start().catch(console.error); 
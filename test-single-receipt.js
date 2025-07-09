const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testSingleReceipt() {
    const imagePath = 'images/test/edeka_1.jpg';
    
    console.log('🔄 Testing fixed parser with edeka_1.jpg');
    
    if (!fs.existsSync(imagePath)) {
        console.log(`❌ Image not found: ${imagePath}`);
        return;
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
            
            if (result.receipt.items && result.receipt.items.length > 0) {
                console.log('\n📋 Extracted items:');
                result.receipt.items.forEach((item, index) => {
                    console.log(`${index + 1}. ${item.product_name} - Qty: ${item.quantity} - Price: ${item.total_price || 'N/A'}`);
                });
            }
        } else {
            console.log(`❌ Error: ${result.error}`);
        }
    } catch (error) {
        console.log(`❌ Request failed: ${error.message}`);
    }
}

// Wait for server to start
setTimeout(testSingleReceipt, 3000); 
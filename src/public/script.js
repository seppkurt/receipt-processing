// DOM elements
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');

// Results elements
const receiptImage = document.getElementById('receipt-image');
const receiptTotal = document.getElementById('receipt-total');
const receiptDate = document.getElementById('receipt-date');
const itemsCount = document.getElementById('items-count');
const storeInfoItem = document.getElementById('store-info-item');
const storeName = document.getElementById('store-name');
const itemsTableBody = document.getElementById('items-table-body');
const rawMarkdown = document.getElementById('raw-markdown');

// Store and payment details
const storeDetails = document.getElementById('store-details');
const storeDetailsContent = document.getElementById('store-details-content');
const paymentDetails = document.getElementById('payment-details');
const paymentDetailsContent = document.getElementById('payment-details-content');

// Buttons
const newReceiptBtn = document.getElementById('new-receipt-btn');
const retryBtn = document.getElementById('retry-btn');
const errorMessage = document.getElementById('error-message');

// Event listeners
browseBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('click', () => fileInput.click());
newReceiptBtn.addEventListener('click', resetToUpload);
retryBtn.addEventListener('click', resetToUpload);

// Drag and drop functionality
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showError('Please select an image file.');
        return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
        showError('File size must be less than 10MB.');
        return;
    }

    // Process the file
    processReceipt(file);
}

async function processReceipt(file) {
    try {
        // Show processing state
        showProcessing();

        // Create FormData
        const formData = new FormData();
        formData.append('receipt', file);

        // Send to API
        const response = await fetch('/api/process-receipt', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process receipt');
        }

        const result = await response.json();
        showResults(result, file);

    } catch (error) {
        console.error('Error processing receipt:', error);
        showError(error.message || 'An error occurred while processing your receipt.');
    }
}

function showProcessing() {
    uploadSection.style.display = 'none';
    processingSection.style.display = 'block';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function showResults(data, file) {
    // Display uploaded image
    const imageUrl = URL.createObjectURL(file);
    receiptImage.src = imageUrl;
    receiptImage.onload = () => URL.revokeObjectURL(imageUrl);

    // Update receipt summary
    const total = data.receipt.totals.total_amount;
    receiptTotal.textContent = total ? `€${total.toFixed(2)}` : 'Not found';
    
    const date = data.receipt.metadata.date;
    receiptDate.textContent = date || 'Not found';
    
    itemsCount.textContent = data.receipt.items.length;

    // Update store information
    if (data.receipt.store.name) {
        storeInfoItem.style.display = 'flex';
        storeName.textContent = data.receipt.store.name;
        showStoreDetails(data.receipt.store);
    } else {
        storeInfoItem.style.display = 'none';
        storeDetails.style.display = 'none';
    }

    // Update payment information
    if (data.receipt.payment.method || data.receipt.payment.amount_paid) {
        showPaymentDetails(data.receipt.payment);
    } else {
        paymentDetails.style.display = 'none';
    }

    // Update items table
    itemsTableBody.innerHTML = '';
    data.receipt.items.forEach(item => {
        const row = createTableRow(item);
        itemsTableBody.appendChild(row);
    });

    // Update raw markdown (for debugging)
    rawMarkdown.textContent = data.ocr_data.raw_markdown || 'No raw data available';

    // Show results
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'block';
    errorSection.style.display = 'none';
}

function showStoreDetails(store) {
    storeDetails.style.display = 'block';
    storeDetailsContent.innerHTML = '';

    const storeData = [
        { key: 'name', label: 'Store Name' },
        { key: 'address', label: 'Address' },
        { key: 'phone', label: 'Phone' },
        { key: 'tax_id', label: 'Tax ID' },
        { key: 'store_chain', label: 'Chain' }
    ];

    storeData.forEach(({ key, label }) => {
        if (store[key]) {
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';
            detailItem.innerHTML = `
                <span class="label">${label}:</span>
                <span class="value">${store[key]}</span>
            `;
            storeDetailsContent.appendChild(detailItem);
        }
    });
}

function showPaymentDetails(payment) {
    paymentDetails.style.display = 'block';
    paymentDetailsContent.innerHTML = '';

    const paymentData = [
        { key: 'method', label: 'Method' },
        { key: 'amount_paid', label: 'Amount Paid', format: (val) => `€${val.toFixed(2)}` },
        { key: 'change', label: 'Change', format: (val) => `€${val.toFixed(2)}` },
        { key: 'card_type', label: 'Card Type' }
    ];

    paymentData.forEach(({ key, label, format }) => {
        if (payment[key]) {
            const detailItem = document.createElement('div');
            detailItem.className = 'detail-item';
            const value = format ? format(payment[key]) : payment[key];
            detailItem.innerHTML = `
                <span class="label">${label}:</span>
                <span class="value">${value}</span>
            `;
            paymentDetailsContent.appendChild(detailItem);
        }
    });
}

function createTableRow(item) {
    const row = document.createElement('tr');
    
    const badge = item.matched ? 
        '<span class="status-badge matched-badge">✓ Matched</span>' : 
        '<span class="status-badge unmatched-badge">? Unmatched</span>';

    row.innerHTML = `
        <td><span class="item-code">${item.item_code}</span></td>
        <td class="product-name">${item.product_name}</td>
        <td class="quantity">${item.quantity}</td>
        <td class="unit-price">€${item.unit_price.toFixed(2)}</td>
        <td class="total-price">€${item.total_price.toFixed(2)}</td>
        <td class="brand">${item.brand || '-'}</td>
        <td>${badge}</td>
    `;

    return row;
}

function showError(message) {
    errorMessage.textContent = message;
    uploadSection.style.display = 'none';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'block';
}

function resetToUpload() {
    // Reset file input
    fileInput.value = '';
    
    // Reset sections
    uploadSection.style.display = 'block';
    processingSection.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
    
    // Reset results
    receiptImage.src = '';
    receiptTotal.textContent = '€0.00';
    receiptDate.textContent = 'Not found';
    itemsCount.textContent = '0';
    storeInfoItem.style.display = 'none';
    storeName.textContent = 'Not found';
    itemsTableBody.innerHTML = '';
    rawMarkdown.textContent = '';
    
    // Reset details sections
    storeDetails.style.display = 'none';
    paymentDetails.style.display = 'none';
}

// Add some visual feedback for the upload area
uploadArea.addEventListener('mouseenter', () => {
    if (uploadSection.style.display !== 'none') {
        uploadArea.style.transform = 'scale(1.02)';
    }
});

uploadArea.addEventListener('mouseleave', () => {
    uploadArea.style.transform = 'scale(1)';
    uploadArea.classList.remove('dragover');
}); 
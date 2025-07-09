const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const OCRService = require('../services/ocr');
const SimpleDatabaseService = require('../services/database-simple');

// Initialize services
const ocr = new OCRService();
const db = new SimpleDatabaseService();

// Initialize database
let dbInitialized = false;
async function ensureDatabase() {
  if (!dbInitialized) {
    await db.initialize();
    dbInitialized = true;
  }
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Processing file:', file.originalname, file.mimetype);
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

// Simple receipt processing endpoint
router.post('/process-receipt', upload.single('receipt'), async (req, res) => {
  console.log('🚀 Receipt processing started');
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ 
        error: 'No file uploaded',
        details: 'Please select an image file to upload'
      });
    }

    console.log('📁 File received:', req.file.originalname, req.file.path);

    // Process with OCR
    console.log('🔍 Starting OCR processing...');
    const ocrResult = await ocr.processImage(req.file.path);
    
    console.log('✅ OCR processing completed');
    console.log('📊 OCR result structure:', {
      hasReceipt: !!ocrResult.receipt,
      hasOcrData: !!ocrResult.ocr_data,
      hasProcessingInfo: !!ocrResult.processing_info,
      rawMarkdownLength: ocrResult.ocr_data?.raw_markdown?.length || 0
    });

    // Store in database
    await ensureDatabase();
    const dbResult = await db.storeReceipt(ocrResult.receipt, ocrResult.ocr_data);
    console.log('💾 Database storage completed, receipt ID:', dbResult.id);

    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log('🗑️ Temporary file cleaned up');
    }

    // Return the complete result
    console.log('📤 Sending response to frontend');
    res.json({
      success: true,
      receipt: ocrResult.receipt,
      ocr_data: ocrResult.ocr_data,
      processing_info: ocrResult.processing_info,
      receipt_id: dbResult.id,
      message: 'Receipt processed and stored successfully'
    });

  } catch (error) {
    console.error('❌ Error processing receipt:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to process receipt',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    ocr_available: !!ocr.apiKey
  });
});

// Get all receipts
router.get('/receipts', async (req, res) => {
  try {
    await ensureDatabase();
    const receipts = await db.getAllReceipts();
    res.json({ receipts });
  } catch (error) {
    console.error('❌ Error fetching receipts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipt by ID
router.get('/receipts/:id', async (req, res) => {
  try {
    await ensureDatabase();
    const receipt = await db.getReceipt(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.json({ receipt });
  } catch (error) {
    console.error('❌ Error fetching receipt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipt by ID with items
router.get('/receipts/:id/details', async (req, res) => {
  try {
    await ensureDatabase();
    const receipt = await db.getReceipt(req.params.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    // Get items for this receipt
    const items = await db.getItemsByReceiptId(req.params.id);
    
    res.json({ 
      receipt,
      items,
      item_count: items.length
    });
  } catch (error) {
    console.error('❌ Error fetching receipt details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all receipts with summary info
router.get('/receipts/list', async (req, res) => {
  try {
    await ensureDatabase();
    const receipts = await db.getAllReceiptsWithSummary();
    res.json({ receipts });
  } catch (error) {
    console.error('❌ Error fetching receipts list:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get receipt statistics
router.get('/stats', async (req, res) => {
  try {
    await ensureDatabase();
    const stats = await db.getReceiptStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all items
router.get('/items', async (req, res) => {
  try {
    await ensureDatabase();
    const items = await db.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('❌ Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unmatched items
router.get('/items/unmatched', async (req, res) => {
  try {
    await ensureDatabase();
    const items = await db.getUnmatchedItems();
    res.json(items);
  } catch (error) {
    console.error('❌ Error fetching unmatched items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all brands
router.get('/brands', async (req, res) => {
  try {
    await ensureDatabase();
    const brands = await db.getAllBrands();
    res.json(brands);
  } catch (error) {
    console.error('❌ Error fetching brands:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new brand
router.post('/brands', async (req, res) => {
  try {
    await ensureDatabase();
    const { name, description, website, country } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Brand name is required' });
    }

    const result = await db.createBrand({ name, description, website, country });
    res.json({ id: result.id, message: 'Brand created successfully' });
  } catch (error) {
    console.error('❌ Error creating brand:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    await ensureDatabase();
    const categories = await db.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new category
router.post('/categories', async (req, res) => {
  try {
    await ensureDatabase();
    const { name, parent_id, description, color, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await db.createCategory({ name, parent_id, description, color, icon });
    res.json({ id: result.id, message: 'Category created successfully' });
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    await ensureDatabase();
    const products = await db.getAllProducts();
    res.json(products);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new product
router.post('/products', async (req, res) => {
  try {
    await ensureDatabase();
    const { name, brand, category, description, unit_size, unit_type, typical_price, typical_price_currency } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const result = await db.createProduct({ 
      name, brand, category, description, unit_size, unit_type, typical_price, typical_price_currency 
    });
    res.json({ id: result.id, message: 'Product created successfully' });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Match item to product
router.post('/items/:itemId/match', async (req, res) => {
  try {
    await ensureDatabase();
    const { itemId } = req.params;
    const { productId, confidenceScore } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    await db.matchItem(itemId, productId, confidenceScore || 1.0);
    res.json({ message: 'Item matched successfully' });
  } catch (error) {
    console.error('❌ Error matching item:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 
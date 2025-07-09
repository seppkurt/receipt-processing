const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SimpleDatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/receipts.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      const fs = require('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection error:', err.message);
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Receipts table
      `CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_name TEXT,
        store_address TEXT,
        store_phone TEXT,
        store_tax_id TEXT,
        store_chain TEXT,
        date TEXT,
        time TEXT,
        total_amount REAL,
        currency TEXT DEFAULT 'EUR',
        payment_method TEXT,
        payment_amount REAL,
        payment_change REAL,
        raw_markdown TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Items table - updated to support items without prices
      `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER,
        product_name TEXT NOT NULL,
        quantity REAL,
        unit_price REAL,
        total_price REAL,
        brand TEXT,
        item_code TEXT UNIQUE,
        line_text TEXT,
        matched BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receipt_id) REFERENCES receipts (id)
      )`,

      // Products table for catalog
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        description TEXT,
        unit_size TEXT,
        unit_type TEXT,
        typical_price REAL,
        typical_price_currency TEXT DEFAULT 'EUR',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Brands table
      `CREATE TABLE IF NOT EXISTS brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        website TEXT,
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Categories table
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        parent_id INTEGER,
        description TEXT,
        color TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories (id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('❌ Database run error:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('❌ Database get error:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Database all error:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Generate unique item code
  generateItemCode(productName) {
    const cleanName = productName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${cleanName.substring(0, 8)}${timestamp}${random}`.toUpperCase();
  }

  async storeReceipt(receiptData, ocrData) {
    try {
      
      // Insert receipt
      const receiptSql = `
        INSERT INTO receipts (
          store_name, store_address, store_phone, store_tax_id, store_chain,
          date, time, total_amount, currency, payment_method, payment_amount, payment_change,
          raw_markdown
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const receiptParams = [
        receiptData.store?.name || null,
        receiptData.store?.address || null,
        receiptData.store?.phone || null,
        receiptData.store?.tax_id || null,
        receiptData.store?.store_chain || null,
        receiptData.metadata?.date || null,
        receiptData.metadata?.time || null,
        receiptData.totals?.total_amount || null,
        receiptData.totals?.currency || 'EUR',
        receiptData.payment?.method || null,
        receiptData.payment?.amount_paid || null,
        receiptData.payment?.change || null,
        ocrData.raw_markdown || null
      ];

      const receiptResult = await this.run(receiptSql, receiptParams);
      const receiptId = receiptResult.id;

      // Insert items - now supporting items without prices
      if (receiptData.items && receiptData.items.length > 0) {
        const itemSql = `
          INSERT INTO items (
            receipt_id, product_name, quantity, unit_price, total_price,
            brand, item_code, line_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const item of receiptData.items) {
          // Generate unique item code if not provided
          const itemCode = item.item_code || this.generateItemCode(item.product_name);
          
          const itemParams = [
            receiptId,
            item.product_name || 'Unknown Product',
            item.quantity || null,
            item.unit_price || null,
            item.total_price || null,
            item.brand || null,
            itemCode,
            item.line_text || null
          ];
          
          await this.run(itemSql, itemParams);
        }
        
        console.log(`✅ Stored ${receiptData.items.length} items`);
      }

      return { id: receiptId };
    } catch (error) {
      console.error('❌ Error storing receipt:', error);
      throw error;
    }
  }

  async getReceipt(id) {
    const receipt = await this.get('SELECT * FROM receipts WHERE id = ?', [id]);
    if (!receipt) return null;

    const items = await this.all('SELECT * FROM items WHERE receipt_id = ?', [id]);
    return { ...receipt, items };
  }

  // Get all receipts
  async getAllReceipts() {
    return this.all('SELECT * FROM receipts ORDER BY created_at DESC');
  }

  // Get all receipts with summary info (for list page)
  async getAllReceiptsWithSummary() {
    const sql = `
      SELECT 
        r.id,
        r.store_name,
        r.store_address,
        r.date,
        r.time,
        r.total_amount,
        r.currency,
        r.payment_method,
        r.created_at,
        COUNT(i.id) as item_count,
        SUM(CASE WHEN i.total_price IS NOT NULL THEN i.total_price ELSE 0 END) as calculated_total
      FROM receipts r
      LEFT JOIN items i ON r.id = i.receipt_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `;
    return this.all(sql);
  }

  // Get items by receipt ID
  async getItemsByReceiptId(receiptId) {
    return this.all('SELECT * FROM items WHERE receipt_id = ? ORDER BY id', [receiptId]);
  }

  async getAllItems() {
    return await this.all(`
      SELECT i.*, r.store_name, r.date as receipt_date 
      FROM items i 
      LEFT JOIN receipts r ON i.receipt_id = r.id 
      ORDER BY i.created_at DESC
    `);
  }

  async getUnmatchedItems() {
    return await this.all(`
      SELECT i.*, r.store_name, r.date as receipt_date 
      FROM items i 
      LEFT JOIN receipts r ON i.receipt_id = r.id 
      WHERE i.matched = 0 
      ORDER BY i.created_at DESC
    `);
  }

  async getReceiptStats() {
    const stats = await this.get(`
      SELECT 
        COUNT(*) as total_receipts,
        (SELECT COUNT(*) FROM items) as total_items,
        (SELECT COUNT(*) FROM items WHERE matched = 1) as matched_items,
        (SELECT COUNT(*) FROM items WHERE matched = 0) as unmatched_items
      FROM receipts
    `);
    return stats;
  }

  // Brand management
  async getAllBrands() {
    return await this.all('SELECT * FROM brands ORDER BY name');
  }

  async createBrand(brandData) {
    const sql = `INSERT INTO brands (name, description, website, country) VALUES (?, ?, ?, ?)`;
    const params = [brandData.name, brandData.description, brandData.website, brandData.country];
    return await this.run(sql, params);
  }

  // Category management
  async getAllCategories() {
    return await this.all('SELECT * FROM categories ORDER BY name');
  }

  async createCategory(categoryData) {
    const sql = `INSERT INTO categories (name, parent_id, description, color, icon) VALUES (?, ?, ?, ?, ?)`;
    const params = [categoryData.name, categoryData.parent_id, categoryData.description, categoryData.color, categoryData.icon];
    return await this.run(sql, params);
  }

  // Product management
  async getAllProducts() {
    return await this.all('SELECT * FROM products ORDER BY name');
  }

  async createProduct(productData) {
    const sql = `INSERT INTO products (name, brand, category, description, unit_size, unit_type, typical_price, typical_price_currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
      productData.name, 
      productData.brand, 
      productData.category, 
      productData.description, 
      productData.unit_size, 
      productData.unit_type, 
      productData.typical_price, 
      productData.typical_price_currency || 'EUR'
    ];
    return await this.run(sql, params);
  }

  // Item matching
  async matchItem(itemId, productId, confidenceScore = 1.0) {
    const sql = `UPDATE items SET matched = 1 WHERE id = ?`;
    return await this.run(sql, [itemId]);
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  }
}

module.exports = SimpleDatabaseService; 
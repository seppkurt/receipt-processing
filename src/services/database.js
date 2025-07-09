const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../../data/receipts.db');
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
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
        date TEXT,
        time TEXT,
        store_name TEXT,
        store_address TEXT,
        store_phone TEXT,
        store_tax_id TEXT,
        store_chain TEXT,
        total_amount REAL,
        subtotal REAL,
        vat_amount REAL,
        vat_rate REAL,
        currency TEXT DEFAULT 'EUR',
        payment_method TEXT,
        payment_amount REAL,
        payment_change REAL,
        payment_card_type TEXT,
        cashier_start_time TEXT,
        cashier_end_time TEXT,
        cashier_number TEXT,
        terminal_number TEXT,
        tse_signature TEXT,
        signature_counter TEXT,
        signature TEXT,
        signature_data TEXT,
        fiscal_data TEXT,
        loyalty_program TEXT,
        loyalty_points_earned INTEGER,
        loyalty_points_balance INTEGER,
        raw_markdown TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Items table (extracted from receipts)
      `CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER,
        item_code TEXT UNIQUE,
        product_name TEXT,
        quantity INTEGER,
        unit_price REAL,
        total_price REAL,
        brand TEXT,
        category TEXT,
        matched BOOLEAN DEFAULT FALSE,
        matched_product_id INTEGER,
        line_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receipt_id) REFERENCES receipts (id),
        FOREIGN KEY (matched_product_id) REFERENCES products (id)
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
      )`,

      // Products table (master product catalog)
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand_id INTEGER,
        category_id INTEGER,
        barcode TEXT UNIQUE,
        description TEXT,
        unit_size TEXT,
        unit_type TEXT,
        typical_price REAL,
        typical_price_currency TEXT DEFAULT 'EUR',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (brand_id) REFERENCES brands (id),
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )`,

      // Item matches table (for manual matching)
      `CREATE TABLE IF NOT EXISTS item_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        product_id INTEGER,
        confidence_score REAL,
        matched_by TEXT DEFAULT 'manual',
        matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES items (id),
        FOREIGN KEY (product_id) REFERENCES products (id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Insert default categories
    await this.insertDefaultCategories();
    
    // Insert default brands
    await this.insertDefaultBrands();
    
    // Insert sample products
    await this.insertSampleProducts();
  }

  async insertDefaultCategories() {
    const categories = [
      // Food & Beverages
      { name: 'Food & Beverages', parent_id: null, color: '#4CAF50', icon: '🍽️' },
      { name: 'Dairy & Eggs', parent_id: 1, color: '#8BC34A', icon: '🥛' },
      { name: 'Bread & Bakery', parent_id: 1, color: '#CDDC39', icon: '🥖' },
      { name: 'Fruits & Vegetables', parent_id: 1, color: '#4CAF50', icon: '🥬' },
      { name: 'Meat & Fish', parent_id: 1, color: '#F44336', icon: '🥩' },
      { name: 'Frozen Foods', parent_id: 1, color: '#2196F3', icon: '🧊' },
      { name: 'Canned Goods', parent_id: 1, color: '#FF9800', icon: '🥫' },
      { name: 'Pasta & Rice', parent_id: 1, color: '#795548', icon: '🍝' },
      { name: 'Snacks & Sweets', parent_id: 1, color: '#E91E63', icon: '🍫' },
      { name: 'Beverages', parent_id: 1, color: '#9C27B0', icon: '🥤' },
      
      // Household & Personal Care
      { name: 'Household & Personal Care', parent_id: null, color: '#2196F3', icon: '🏠' },
      { name: 'Cleaning Supplies', parent_id: 11, color: '#00BCD4', icon: '🧽' },
      { name: 'Personal Hygiene', parent_id: 11, color: '#009688', icon: '🧴' },
      { name: 'Baby Care', parent_id: 11, color: '#FFC107', icon: '👶' },
      { name: 'Pet Supplies', parent_id: 11, color: '#FF5722', icon: '🐕' },
      
      // Health & Beauty
      { name: 'Health & Beauty', parent_id: null, color: '#E91E63', icon: '💄' },
      { name: 'Cosmetics', parent_id: 16, color: '#F06292', icon: '💋' },
      { name: 'Hair Care', parent_id: 16, color: '#BA68C8', icon: '💇' },
      { name: 'Skin Care', parent_id: 16, color: '#FFB74D', icon: '🧴' },
      { name: 'Oral Care', parent_id: 16, color: '#4FC3F7', icon: '🦷' },
      { name: 'Vitamins & Supplements', parent_id: 16, color: '#81C784', icon: '💊' }
    ];

    for (const category of categories) {
      await this.run(
        'INSERT OR IGNORE INTO categories (name, parent_id, color, icon) VALUES (?, ?, ?, ?)',
        [category.name, category.parent_id, category.color, category.icon]
      );
    }
  }

  async insertDefaultBrands() {
    const brands = [
      // German FMCG Brands
      { name: 'Milka', description: 'Chocolate brand', country: 'Germany' },
      { name: 'Haribo', description: 'Confectionery brand', country: 'Germany' },
      { name: 'Ricola', description: 'Herbal candy brand', country: 'Switzerland' },
      { name: 'Pringles', description: 'Potato chips brand', country: 'USA' },
      { name: 'Fuchs', description: 'Spices and seasonings', country: 'Germany' },
      { name: 'Ma.GAT', description: 'Food products', country: 'Germany' },
      { name: 'Ehr', description: 'Dairy products', country: 'Germany' },
      { name: 'FF 3J', description: 'Baby food brand', country: 'Germany' },
      { name: 'Odo1', description: 'Oral care products', country: 'Germany' },
      { name: 'Becel', description: 'Margarine and spreads', country: 'Netherlands' },
      { name: 'Onken', description: 'Yogurt and dairy products', country: 'Germany' },
      { name: 'Hohes C', description: 'Vitamin C products', country: 'Germany' },
      { name: 'Kaufland', description: 'Private label products', country: 'Germany' },
      { name: 'EDEKA', description: 'Private label products', country: 'Germany' },
      { name: 'dm', description: 'dm-drogerie markt private label', country: 'Germany' },
      { name: 'real', description: 'real- private label products', country: 'Germany' }
    ];

    for (const brand of brands) {
      await this.run(
        'INSERT OR IGNORE INTO brands (name, description, country) VALUES (?, ?, ?)',
        [brand.name, brand.description, brand.country]
      );
    }
  }

  async insertSampleProducts() {
    const products = [
      // Baby Food
      { name: 'GetreideR. Banane Traube', brand_id: 8, category_id: 9, unit_size: '4x23g', unit_type: 'pack' },
      { name: 'Getreide Rie. Apfel-Karo', brand_id: 8, category_id: 9, unit_size: '4x23g', unit_type: 'pack' },
      { name: 'Rieg. Ban&Kirsche', brand_id: 8, category_id: 9, unit_size: '4x23g', unit_type: 'pack' },
      
      // Oral Care
      { name: 'med 3 Zahner.Orig. 75ml', brand_id: 9, category_id: 20, unit_size: '75ml', unit_type: 'bottle' },
      { name: 'Med 3 ZC Münzfrisch', brand_id: 9, category_id: 20, unit_size: '75ml', unit_type: 'tube' },
      { name: 'med3 Juniorzahn Z', brand_id: 9, category_id: 20, unit_size: '50ml', unit_type: 'tube' },
      
      // Chocolate & Sweets
      { name: 'Schokolade', brand_id: 1, category_id: 9, unit_size: '100g', unit_type: 'bar' },
      { name: 'Kuhflecken', brand_id: 1, category_id: 9, unit_size: '100g', unit_type: 'bar' },
      { name: 'Tafel', brand_id: 1, category_id: 9, unit_size: '100g', unit_type: 'bar' },
      { name: 'Kugeln', brand_id: 1, category_id: 9, unit_size: '100g', unit_type: 'pack' },
      { name: 'Kinderschokolade', brand_id: 1, category_id: 9, unit_size: '100g', unit_type: 'bar' },
      
      // Snacks
      { name: 'Pringles Original', brand_id: 4, category_id: 9, unit_size: '190g', unit_type: 'can' },
      { name: 'GOLDBAEREN', brand_id: 2, category_id: 9, unit_size: '300g', unit_type: 'bag' },
      
      // Dairy
      { name: 'Früchtetraum', brand_id: 7, category_id: 2, unit_size: '125g', unit_type: 'cup' },
      { name: 'Joghurt', brand_id: 11, category_id: 2, unit_size: '150g', unit_type: 'cup' },
      
      // Spices
      { name: 'Fischgewürz', brand_id: 5, category_id: 8, unit_size: '50g', unit_type: 'jar' },
      { name: 'Kartoffelc.', brand_id: 6, category_id: 8, unit_size: '50g', unit_type: 'jar' },
      { name: 'Spanncre.', brand_id: 6, category_id: 8, unit_size: '50g', unit_type: 'jar' },
      
      // Beverages
      { name: 'Ener.Min.Wil.', brand_id: 6, category_id: 10, unit_size: '500ml', unit_type: 'bottle' },
      { name: 'Salbei', brand_id: 3, category_id: 10, unit_size: '50g', unit_type: 'pack' }
    ];

    for (const product of products) {
      await this.run(
        'INSERT OR IGNORE INTO products (name, brand_id, category_id, unit_size, unit_type) VALUES (?, ?, ?, ?, ?)',
        [product.name, product.brand_id, product.category_id, product.unit_size, product.unit_type]
      );
    }
  }

  async createReceipt(receiptData) {
    const sql = `
      INSERT INTO receipts (
        date, time, store_name, store_address, store_phone, store_tax_id, store_chain,
        total_amount, subtotal, vat_amount, vat_rate, currency,
        payment_method, payment_amount, payment_change, payment_card_type,
        cashier_start_time, cashier_end_time, cashier_number, terminal_number,
        tse_signature, signature_counter, signature, signature_data, fiscal_data,
        loyalty_program, loyalty_points_earned, loyalty_points_balance, raw_markdown
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      receiptData.metadata.date,
      receiptData.metadata.time,
      receiptData.store.name,
      receiptData.store.address,
      receiptData.store.phone,
      receiptData.store.tax_id,
      receiptData.store.store_chain,
      receiptData.totals.total_amount,
      receiptData.totals.subtotal,
      receiptData.totals.vat_amount,
      receiptData.totals.vat_rate,
      receiptData.totals.currency,
      receiptData.payment.method,
      receiptData.payment.amount_paid,
      receiptData.payment.change,
      receiptData.payment.card_type,
      receiptData.cashier_info.start_time,
      receiptData.cashier_info.end_time,
      receiptData.cashier_info.cashier_number,
      receiptData.cashier_info.terminal_number,
      receiptData.fiscal_info.tse_signature,
      receiptData.fiscal_info.signature_counter,
      receiptData.fiscal_info.signature,
      receiptData.fiscal_info.signature_data,
      receiptData.fiscal_info.fiscal_data,
      receiptData.loyalty.program,
      receiptData.loyalty.points_earned,
      receiptData.loyalty.points_balance,
      receiptData.raw_markdown
    ];

    return await this.run(sql, params);
  }

  async createItem(itemData, receiptId) {
    const sql = `
      INSERT INTO items (
        receipt_id, item_code, product_name, quantity, unit_price, total_price,
        brand, category, line_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      receiptId,
      itemData.item_code,
      itemData.product_name,
      itemData.quantity,
      itemData.unit_price,
      itemData.total_price,
      itemData.brand,
      itemData.category,
      itemData.line_text
    ];

    return await this.run(sql, params);
  }

  async getAllItems() {
    return await this.all(`
      SELECT i.*, r.date as receipt_date, r.store_name
      FROM items i
      LEFT JOIN receipts r ON i.receipt_id = r.id
      ORDER BY i.created_at DESC
    `);
  }

  async getUnmatchedItems() {
    return await this.all(`
      SELECT i.*, r.date as receipt_date, r.store_name
      FROM items i
      LEFT JOIN receipts r ON i.receipt_id = r.id
      WHERE i.matched = FALSE
      ORDER BY i.created_at DESC
    `);
  }

  async getAllBrands() {
    return await this.all('SELECT * FROM brands ORDER BY name');
  }

  async getAllCategories() {
    return await this.all(`
      SELECT c.*, p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      ORDER BY c.parent_id, c.name
    `);
  }

  async getAllProducts() {
    return await this.all(`
      SELECT p.*, b.name as brand_name, c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      ORDER BY p.name
    `);
  }

  async searchProducts(query) {
    return await this.all(`
      SELECT p.*, b.name as brand_name, c.name as category_name
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = TRUE
      AND (p.name LIKE ? OR b.name LIKE ? OR c.name LIKE ?)
      ORDER BY p.name
    `, [`%${query}%`, `%${query}%`, `%${query}%`]);
  }

  async matchItem(itemId, productId, confidenceScore = 1.0) {
    // Create match record
    await this.run(
      'INSERT INTO item_matches (item_id, product_id, confidence_score) VALUES (?, ?, ?)',
      [itemId, productId, confidenceScore]
    );

    // Update item as matched
    await this.run(
      'UPDATE items SET matched = TRUE, matched_product_id = ? WHERE id = ?',
      [productId, itemId]
    );
  }

  async createProduct(productData) {
    const sql = `
      INSERT INTO products (name, brand_id, category_id, barcode, description, unit_size, unit_type, typical_price, typical_price_currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      productData.name,
      productData.brand_id,
      productData.category_id,
      productData.barcode,
      productData.description,
      productData.unit_size,
      productData.unit_type,
      productData.typical_price,
      productData.typical_price_currency || 'EUR'
    ];

    return await this.run(sql, params);
  }

  async createBrand(brandData) {
    const sql = `
      INSERT INTO brands (name, description, website, country)
      VALUES (?, ?, ?, ?)
    `;

    const params = [
      brandData.name,
      brandData.description,
      brandData.website,
      brandData.country
    ];

    return await this.run(sql, params);
  }

  async createCategory(categoryData) {
    const sql = `
      INSERT INTO categories (name, parent_id, description, color, icon)
      VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
      categoryData.name,
      categoryData.parent_id,
      categoryData.description,
      categoryData.color,
      categoryData.icon
    ];

    return await this.run(sql, params);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseService; 
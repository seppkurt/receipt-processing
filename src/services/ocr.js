const { ocr } = require('llama-ocr');
const fs = require('fs');
const path = require('path');

class OCRService {
  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️  TOGETHER_API_KEY not found. Using mock OCR mode.');
      this.mockMode = true;
    } else {
      console.log('✅ OCR Service initialized with Together AI API key');
      this.mockMode = false;
    }
  }

  async processImage(imagePath) {
    try {
      console.log('Processing image with Llama OCR...');
      
      if (this.apiKey) {
        return await this.processWithLlamaOCR(imagePath);
      } else {
        console.log('⚠️ No API key provided, using mock OCR');
        return this.processWithMockOCR();
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      console.log('🔄 Falling back to mock OCR...');
      return this.processWithMockOCR();
    }
  }

  async processWithLlamaOCR(imagePath) {
    try {
      console.log('🔍 Using API key starting with:', this.apiKey.substring(0, 4) + '...');
      console.log('📁 Image path:', imagePath);
      console.log('🔧 Model:', 'Llama-3.2-11B-Vision');

      // Check if file exists and get file info
      if (fs.existsSync(imagePath)) {
        const stats = fs.statSync(imagePath);
        console.log('📊 File size:', stats.size, 'bytes');
        console.log('📅 File modified:', stats.mtime);
      } else {
        console.error('❌ Image file does not exist:', imagePath);
        throw new Error('Image file not found');
      }

      // Process with Llama OCR using the file path directly
      const markdown = await ocr({
        filePath: imagePath,
        apiKey: this.apiKey,
        model: 'Llama-3.2-11B-Vision', // Use 11B Vision model for better results
        prompt: `Please extract the receipt information and format it consistently as markdown with the following structure:

# Receipt

## Store Information
* **Store Name:** [store name]
* **Address:** [address]
* **Phone:** [phone number]
* **Website:** [website if available]

## Items Purchased
| Product | Quantity | Price |
| --- | --- | --- |
[list all items in table format]

## Total
* **Total Amount:** [total]
* **Payment Method:** [payment method]

## Additional Information
* **Date:** [date]
* **Time:** [time]
* **Tax:** [tax information if available]

Please ensure all items are listed in the table format above, even if some prices are missing.`
      });

      console.log('✅ Llama OCR processing completed');
      console.log('📄 Raw markdown length:', markdown ? markdown.length : 0);
      console.log('📄 Raw markdown preview:', markdown ? markdown.substring(0, 100) + '...' : 'empty');
      
      return this.parseMarkdown(markdown);
    } catch (error) {
      console.error('❌ Llama OCR processing failed:');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      console.error('   Error status:', error.status);
      
      // Log full error details if available
      if (error.error) {
        console.error('   API Error details:', JSON.stringify(error.error, null, 2));
      }
      
      if (error.headers) {
        console.error('   Response headers:', JSON.stringify(error.headers, null, 2));
      }
      
      if (error.response) {
        console.error('   Response body:', JSON.stringify(error.response, null, 2));
      }
      
      // Log the full error object for debugging
      console.error('   Full error object:', JSON.stringify(error, null, 2));
      
      // Fallback to mock OCR if real OCR fails
      console.log('🔄 Falling back to mock OCR...');
      return this.processWithMockOCR();
    }
  }

  processWithMockOCR() {
    const mockMarkdown = `# Receipt

Vollmilch 3.5% 2x €3.50
Vollkornbrot 1x €2.80
Bio Äpfel 1kg €4.20
Tomaten 500g €2.50

Total: €13.00
Date: 2024-01-15`;

    console.log('✅ Mock OCR processing completed');
    return this.parseMarkdown(mockMarkdown);
  }

  parseMarkdown(markdown) {
    console.log('Parsing markdown:', markdown.substring(0, 200) + '...');
    
    const lines = markdown.split('\n');
    const result = {
      receipt: {
        metadata: { date: null, time: null, receipt_number: null, transaction_id: null },
        store: { name: null, address: null, phone: null, tax_id: null, store_chain: null },
        items: [],
        totals: { subtotal: null, vat_amount: null, vat_rate: null, total_amount: null, currency: 'EUR' },
        payment: { method: null, amount_paid: null, change: null, card_type: null, card_number: null },
        cashier_info: { start_time: null, end_time: null, cashier_number: null, terminal_number: null },
        fiscal_info: { tse_signature: null, signature_counter: null, signature: null, signature_data: null, fiscal_data: null },
        loyalty: { program: null, points_earned: null, points_balance: null }
      },
      ocr_data: {
        raw_markdown: markdown,
        confidence_score: null,
        processing_time: null
      },
      processing_info: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ocr_model: 'Llama-3.2-11B-Vision',
        parser_version: '1.0.0'
      }
    };

    // Try multiple parsing strategies
    this.extractStructuredData(lines, result);
    this.extractLineData(lines, result);
    this.extractPatternData(markdown, result);
    
    // If no items found, try fallback extraction
    if (result.receipt.items.length === 0) {
      this.extractItemsFallback(markdown, result);
    }

    console.log('OCR result:', {
      receipt: {
        metadata: result.receipt.metadata,
        store: result.receipt.store,
        items: result.receipt.items.length,
        totals: result.receipt.totals,
        payment: result.receipt.payment
      },
      ocr_data: {
        raw_markdown: result.ocr_data.raw_markdown.substring(0, 100) + '...',
        confidence_score: result.ocr_data.confidence_score,
        processing_time: result.ocr_data.processing_time
      },
      processing_info: result.processing_info
    });

    return result;
  }

  extractStructuredData(lines, result) {
    let inTable = false;
    let inItemsSection = false;
    let inItemsPurchased = false;
    let inEDEKATable = false;
    let currentProduct = null;
    let inProductsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for "Products Purchased" section
      if (line.includes('Products Purchased') || line.includes('Products purchased')) {
        inProductsSection = true;
        continue;
      }
      
      if (inProductsSection) {
        // Check for product line like "* **G&G Gouda Oer**"
        const productMatch = line.match(/\*\s*\*\*([^*]+)\*\*/);
        if (productMatch) {
          currentProduct = productMatch[1].trim();
          continue;
        }
        
        // Check for quantity line like "+ Quantity: 2"
        if (currentProduct && line.startsWith('+') && line.includes('Quantity:')) {
          const quantityMatch = line.match(/Quantity:\s*([0-9,\.]+)/);
          const priceMatch = line.match(/Price:\s*€([0-9,\.]+)/);
          
          let quantity = 1;
          let price = null;
          
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1].replace(',', '.'));
          }
          
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
          }
          
          // Look ahead for price if not found
          if (!price) {
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              if (nextLine.startsWith('+') && nextLine.includes('Price:')) {
                const nextPriceMatch = nextLine.match(/Price:\s*€([0-9,\.]+)/);
                if (nextPriceMatch) {
                  price = parseFloat(nextPriceMatch[1].replace(',', '.'));
                }
                break;
              }
              // Stop if we hit another product
              if (nextLine.startsWith('*') && nextLine.includes('**')) {
                break;
              }
            }
          }
          
          if (currentProduct && !this.isNotAProduct(currentProduct)) {
            result.receipt.items.push({
              product_name: currentProduct,
              quantity: quantity,
              unit_price: price ? price / quantity : null,
              total_price: price || null,
              category: null,
              brand: this.extractBrand(currentProduct),
              item_code: this.generateItemCode(currentProduct),
              line_text: `${currentProduct} - Qty: ${quantity} - Price: €${price || 'N/A'}`,
              matched: false
            });
          }
          
          currentProduct = null;
          continue;
        }
        
        // Check if we've left the products section
        if (!line.startsWith('*') && !line.startsWith('+') && line.length > 0) {
          inProductsSection = false;
          currentProduct = null;
        }
      }
      
      // Check for EDEKA table format with | separators
      if (line.includes('|') && line.includes('**') && !line.includes('---')) {
        // This is a product line like "| **G&G Gouda Geer** | **EUR** |"
        const productMatch = line.match(/\*\*([^*]+)\*\*/);
        if (productMatch) {
          currentProduct = productMatch[1].trim();
        }
        continue;
      }
      
      // Check for quantity/price line after product
      if (currentProduct && line.includes('|') && !line.includes('**') && !line.includes('---')) {
        const parts = line.split('|').map(col => col.trim()).filter(col => col);
        if (parts.length >= 1) {
          const quantityPrice = parts[0];
          const total = parts[1];
          
          // Parse quantity and price from "1,99 € x 2" or "1,43 A"
          const quantityMatch = quantityPrice.match(/([0-9,]+)\s*€\s*x\s*(\d+)/);
          const simplePriceMatch = quantityPrice.match(/([0-9,]+)\s*[A-Z]/);
          
          let quantity = 1;
          let price = null;
          
          if (quantityMatch) {
            price = this.parsePrice(quantityMatch[1]);
            quantity = parseInt(quantityMatch[2]);
          } else if (simplePriceMatch) {
            price = this.parsePrice(simplePriceMatch[1]);
            quantity = 1;
          }
          
          // Use total if available
          if (total && !price) {
            price = this.parsePrice(total);
          }
          
          if (currentProduct && !this.isNotAProduct(currentProduct)) {
            result.receipt.items.push({
              product_name: currentProduct,
              quantity: quantity,
              unit_price: price ? price / quantity : null,
              total_price: price || null,
              category: null,
              brand: this.extractBrand(currentProduct),
              item_code: this.generateItemCode(currentProduct),
              line_text: `${currentProduct} - ${quantityPrice} - ${total || ''}`,
              matched: false
            });
          }
          
          currentProduct = null;
        }
        continue;
      }
      
      // Reset current product if we hit a non-table line
      if (!line.includes('|') && currentProduct) {
        currentProduct = null;
      }
      
      // Check for EDEKA table format (no | separators) - old format
      if (line.includes('Product') && line.includes('Quantity') && line.includes('Price')) {
        inEDEKATable = true;
        continue;
      }
      
      if (inEDEKATable) {
        // Check if we've reached the end of the table
        if (line.includes('Posten:') || line.includes('SUMME') || line.includes('Datum:')) {
          inEDEKATable = false;
          continue;
        }
        
        // Parse EDEKA table row
        const item = this.parseEDEKATableRow(line);
        if (item) {
          result.receipt.items.push(item);
        }
      }
      
      // Check for standard table structure
      if (line.includes('|') && line.includes('---')) {
        inTable = true;
        continue;
      }
      
      if (inTable && line.includes('|')) {
        const columns = line.split('|').map(col => col.trim()).filter(col => col);
        if (columns.length >= 3) {
          // Try to parse as item row
          const item = this.parseTableRow(columns);
          if (item) {
            result.receipt.items.push(item);
          }
        }
      } else if (inTable) {
        inTable = false;
      }
      
      // Check for items section
      if (this.isItemsSection(line)) {
        inItemsSection = true;
        continue;
      }
      
      if (inItemsSection && line.startsWith('*') && line.includes('**')) {
        const item = this.parseListItem(line);
        if (item) {
          result.receipt.items.push(item);
        }
      } else if (inItemsSection && !line.startsWith('*')) {
        inItemsSection = false;
      }
      
      // Check for "Items Purchased" section (new format)
      if (line.includes('Items Purchased') || line.includes('Items purchased')) {
        inItemsPurchased = true;
        continue;
      }
      
      if (inItemsPurchased && line.startsWith('*') && line.includes('**')) {
        const item = this.parseNewListItem(line, lines, i);
        if (item) {
          result.receipt.items.push(item);
        }
      } else if (inItemsPurchased && !line.startsWith('*') && !line.includes('\t') && !line.includes('+')) {
        inItemsPurchased = false;
      }
    }
  }

  parseEDEKATableRow(line) {
    try {
      // Skip empty lines and header lines
      if (!line || line.includes('---') || line.includes('Product') || line.includes('Quantity') || line.includes('Price')) {
        return null;
      }
      
      // EDEKA format: "Product Name | Quantity | Price | Total"
      // But without | separators, it's more like: "Product Name    Quantity    Price    Total"
      const parts = line.split(/\s{2,}/).filter(part => part.trim());
      
      if (parts.length >= 2) {
        const productName = parts[0].trim();
        const quantity = parts[1] ? parseInt(parts[1]) || 1 : 1;
        const price = parts[2] ? this.parsePrice(parts[2]) : null;
        
        // Skip if it's not a product name
        if (this.isNotAProduct(productName)) {
          return null;
        }
        
        return {
          product_name: productName,
          quantity: quantity,
          unit_price: price ? price / quantity : null,
          total_price: price || null,
          category: null,
          brand: this.extractBrand(productName),
          item_code: this.generateItemCode(productName),
          line_text: line,
          matched: false
        };
      }
    } catch (error) {
      console.log('Error parsing EDEKA table row:', error);
    }
    return null;
  }

  parseTableRow(columns) {
    try {
      const [itemName, quantity, price] = columns;
      
      if (!itemName || itemName === 'Item' || itemName === '---') {
        return null;
      }
      
      const parsedQuantity = parseInt(quantity) || 1;
      const parsedPrice = this.parsePrice(price);
      
      // Return item regardless of price - allow items without prices
      return {
        product_name: itemName,
        quantity: parsedQuantity,
        unit_price: parsedPrice ? parsedPrice / parsedQuantity : null,
        total_price: parsedPrice || null,
        category: null,
        brand: this.extractBrand(itemName),
        item_code: this.generateItemCode(itemName),
        line_text: columns.join(' | '),
        matched: false
      };
    } catch (error) {
      console.log('Error parsing table row:', error);
    }
    return null;
  }

  parseListItem(line) {
    try {
      // Remove markdown formatting
      const cleanLine = line.replace(/^\*\s*/, '').replace(/\*\*/g, '');
      
      // Look for patterns like "**PRODUCT** quantity price" or "**PRODUCT** price"
      const patterns = [
        /\*\*(.+?)\*\*\s+(\d+)\s+([0-9,]+)/,
        /\*\*(.+?)\*\*\s+([0-9,]+)/,
        /\*\*(.+?)\*\*\s+(\d+)\s*[xX]\s*([0-9,]+)/
      ];
      
      for (const pattern of patterns) {
        const match = cleanLine.match(pattern);
        if (match) {
          const productName = match[1].trim();
          const quantity = match[2] ? parseInt(match[2]) : 1;
          const price = this.parsePrice(match[3] || match[2]);
          
          // Return item regardless of price - allow items without prices
          return {
            product_name: productName,
            quantity: quantity,
            unit_price: price ? price / quantity : null,
            total_price: price || null,
            category: null,
            brand: this.extractBrand(productName),
            item_code: this.generateItemCode(productName),
            line_text: cleanLine,
            matched: false
          };
        }
      }
    } catch (error) {
      console.log('Error parsing list item:', error);
    }
    return null;
  }

  parseNewListItem(line, lines, currentIndex) {
    try {
      // Extract product name from line like "* **INGWER**"
      const productMatch = line.match(/\*\s*\*\*([^*]+)\*\*/);
      if (!productMatch) return null;
      
      const productName = productMatch[1].trim();
      let quantity = 1;
      let price = null;
      
      // Look at next few lines for quantity and price
      for (let i = currentIndex + 1; i < Math.min(currentIndex + 10, lines.length); i++) {
        const nextLine = lines[i].trim();
        
        // Skip empty lines
        if (!nextLine) continue;
        
        // If we hit another product, stop
        if (nextLine.startsWith('*') && nextLine.includes('**')) break;
        
        // Look for quantity patterns
        const quantityMatch = nextLine.match(/Quantity:\s*(\d+)/i);
        if (quantityMatch) {
          quantity = parseInt(quantityMatch[1]);
        }
        
        // Look for price patterns
        const priceMatch = nextLine.match(/Price:\s*([0-9,\.]+)\s*EUR/i);
        if (priceMatch) {
          price = this.parsePrice(priceMatch[1]);
        }
        
        // Look for price without EUR
        const priceMatch2 = nextLine.match(/Price:\s*([0-9,\.]+)/i);
        if (priceMatch2 && !price) {
          price = this.parsePrice(priceMatch2[1]);
        }
        
        // Look for weight
        const weightMatch = nextLine.match(/Weight:\s*(\d+)\s*kg/i);
        if (weightMatch) {
          quantity = parseInt(weightMatch[1]);
        }
        
        // Look for EUR / kg (no specific price)
        if (nextLine.includes('EUR / kg') || nextLine.includes('EUR/kg')) {
          price = null; // No specific price available
        }
      }
      
      // Return item regardless of price - allow items without prices
      return {
        product_name: productName,
        quantity: quantity,
        unit_price: price ? price / quantity : null,
        total_price: price || null,
        category: null,
        brand: this.extractBrand(productName),
        item_code: this.generateItemCode(productName),
        line_text: line,
        matched: false
      };
    } catch (error) {
      console.log('Error parsing new list item:', error);
    }
    return null;
  }

  extractLineData(lines, result) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;

      // Extract metadata
      this.extractMetadata(trimmedLine, result.receipt.metadata);

      // Extract store information
      this.extractStoreInfo(trimmedLine, result.receipt.store);

      // Extract totals
      this.extractTotals(trimmedLine, result.receipt.totals);

      // Extract payment information
      this.extractPaymentInfo(trimmedLine, result.receipt.payment);

      // Extract cashier information
      this.extractCashierInfo(trimmedLine, result.receipt.cashier_info);

      // Extract fiscal information
      this.extractFiscalInfo(trimmedLine, result.receipt.fiscal_info);

      // Extract loyalty information
      this.extractLoyaltyInfo(trimmedLine, result.receipt.loyalty);

      // Extract item line (only if not already found in structured data)
      if (result.receipt.items.length === 0) {
        const itemMatch = this.extractItem(trimmedLine);
        if (itemMatch) {
          result.receipt.items.push(itemMatch);
        }
      }
    }
  }

  extractMetadata(line, metadata) {
    // Extract date
    if (!metadata.date) {
      const dateMatch = this.extractDate(line);
      if (dateMatch) {
        metadata.date = dateMatch;
      }
    }

    // Extract time
    if (!metadata.time) {
      const timeMatch = line.match(/(\d{2}:\d{2})/);
      if (timeMatch) {
        metadata.time = timeMatch[1];
      }
    }
  }

  extractStoreInfo(line, store) {
    // Extract store name - clean up the format
    if (!store.name) {
      // Look for store name patterns and clean them up
      const storePatterns = [
        { pattern: /EDEKA/i, name: 'EDEKA', chain: 'EDEKA' },
        { pattern: /Kaufland/i, name: 'Kaufland', chain: 'Kaufland' },
        { pattern: /dm-drogerie/i, name: 'dm-drogerie markt', chain: 'dm-drogerie' },
        { pattern: /real-/i, name: 'real', chain: 'real' },
        { pattern: /Kaisers Tengelmann/i, name: 'Kaisers Tengelmann', chain: 'Kaisers' },
        { pattern: /Rewe/i, name: 'REWE', chain: 'REWE' },
        { pattern: /Lidl/i, name: 'Lidl', chain: 'Lidl' },
        { pattern: /Aldi/i, name: 'Aldi', chain: 'Aldi' }
      ];
      
      for (const storePattern of storePatterns) {
        if (line.match(storePattern.pattern)) {
          // Clean up the store name - remove markdown formatting and extra text
          let cleanName = line.replace(/\*\*/g, '').replace(/^\*\s*/, '').trim();
          
          // Remove common prefixes/suffixes
          cleanName = cleanName.replace(/^\*?\s*Store Name:\s*/i, '');
          cleanName = cleanName.replace(/^\*?\s*Name:\s*/i, '');
          cleanName = cleanName.replace(/^\*?\s*Company Name:\s*/i, '');
          
          // If the line contains the store name, extract just the store name
          if (cleanName.includes(storePattern.name)) {
            store.name = storePattern.name;
            store.store_chain = storePattern.chain;
            break;
          }
        }
      }
    }
    
    // Extract address
    if (!store.address) {
      if (line.match(/\d{5}\s+[A-Za-zäöüß\s-]+$/)) {
        store.address = line.trim();
      }
    }
    
    // Extract phone
    if (!store.phone) {
      if (line.match(/tel[.:]\s*\d+[\/\s-]?\d+/i)) {
        store.phone = line.trim();
      }
    }

    // Extract tax ID
    if (!store.tax_id) {
      if (line.match(/steuer-nr[.:]\s*(\d+\/\d+)/i)) {
        store.tax_id = line.match(/steuer-nr[.:]\s*(\d+\/\d+)/i)[1];
      }
    }
  }

  extractTotals(line, totals) {
    // Extract total amount
    if (!totals.total_amount) {
      const totalMatch = this.extractTotal(line);
      if (totalMatch) {
        totals.total_amount = totalMatch;
      }
    }

    // Extract VAT
    if (!totals.vat_amount) {
      const vatMatch = line.match(/mwst[:\s]*([0-9,]+)/i);
      if (vatMatch) {
        totals.vat_amount = this.parsePrice(vatMatch[1]);
      }
    }

    // Extract subtotal
    if (!totals.subtotal) {
      const subtotalMatch = line.match(/netto[:\s]*([0-9,]+)/i);
      if (subtotalMatch) {
        totals.subtotal = this.parsePrice(subtotalMatch[1]);
      }
    }
  }

  extractPaymentInfo(line, payment) {
    // Extract payment method
    if (!payment.method) {
      if (line.match(/visa|ec|bar|kartenzahlung/i)) {
        payment.method = line.trim();
        if (line.includes('VISA')) {
          payment.card_type = 'VISA';
        } else if (line.includes('EC')) {
          payment.card_type = 'EC';
        }
      }
    }

    // Extract amount paid
    if (!payment.amount_paid) {
      const paidMatch = line.match(/([0-9,]+)\s*[€€]\s*$/);
      if (paidMatch) {
        payment.amount_paid = this.parsePrice(paidMatch[1]);
      }
    }
  }

  extractCashierInfo(line, cashier) {
    // Extract start time
    if (!cashier.start_time) {
      const startMatch = line.match(/start[:\s]*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
      if (startMatch) {
        cashier.start_time = startMatch[1];
      }
    }

    // Extract end time
    if (!cashier.end_time) {
      const endMatch = line.match(/ende[:\s]*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
      if (endMatch) {
        cashier.end_time = endMatch[1];
      }
    }

    // Extract cashier number
    if (!cashier.cashier_number) {
      const cashierMatch = line.match(/sn-kasse[:\s]*([A-Z0-9]+)/i);
      if (cashierMatch) {
        cashier.cashier_number = cashierMatch[1];
      }
    }

    // Extract terminal number
    if (!cashier.terminal_number) {
      const terminalMatch = line.match(/ta-nummer[:\s]*(\d+)/i);
      if (terminalMatch) {
        cashier.terminal_number = terminalMatch[1];
      }
    }
  }

  extractFiscalInfo(line, fiscal) {
    // Extract TSE signature
    if (!fiscal.tse_signature) {
      const tseMatch = line.match(/sn-tse[:\s]*([a-f0-9]+)/i);
      if (tseMatch) {
        fiscal.tse_signature = tseMatch[1];
      }
    }

    // Extract signature counter
    if (!fiscal.signature_counter) {
      const counterMatch = line.match(/signaturzähler[:\s]*(\d+)/i);
      if (counterMatch) {
        fiscal.signature_counter = counterMatch[1];
      }
    }

    // Extract signature
    if (!fiscal.signature) {
      const sigMatch = line.match(/signatur[:\s]*([A-Z0-9\/]+)/i);
      if (sigMatch) {
        fiscal.signature = sigMatch[1];
      }
    }
  }

  extractLoyaltyInfo(line, loyalty) {
    // Extract PAYBACK points
    if (!loyalty.points_earned) {
      const pointsMatch = line.match(/(\d+)\s+payback\s+punkte/i);
      if (pointsMatch) {
        loyalty.points_earned = parseInt(pointsMatch[1]);
        loyalty.program = 'PAYBACK';
      }
    }
  }

  extractPatternData(markdown, result) {
    // Extract total from various patterns
    if (!result.receipt.totals.total_amount) {
      const totalPatterns = [
        /summe\s*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
        /total\s*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
        /gesamt\s*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
        /[€€]\s*([0-9]+[.,]?[0-9]*)\s*$/im,
        /([0-9]+[.,]?[0-9]*)\s*[€€]\s*$/im
      ];
      
      for (const pattern of totalPatterns) {
        const match = markdown.match(pattern);
        if (match) {
          const amount = this.parsePrice(match[1]);
          if (amount && amount > 0) {
            result.receipt.totals.total_amount = amount;
            break;
          }
        }
      }
    }

    // Extract date from various patterns
    if (!result.receipt.metadata.date) {
      const datePatterns = [
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{2}\.\d{2}\.\d{4})/,
        /(\d{2}\/\d{2}\/\d{4})/,
        /dat\.\s*(\d{2}\.\d{2}\.\d{4})/i,
        /date:\s*(\d{2}\.\d{2}\.\d{4})/i
      ];
      
      for (const pattern of datePatterns) {
        const match = markdown.match(pattern);
        if (match) {
          result.receipt.metadata.date = match[1];
          break;
        }
      }
    }
  }

  extractTotal(line) {
    const totalPatterns = [
      /total[:\s]*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
      /summe[:\s]*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
      /gesamt[:\s]*[€€]?\s*([0-9]+[.,]?[0-9]*)/i,
      /[€€]\s*([0-9]+[.,]?[0-9]*)\s*$/i,
      /([0-9]+[.,]?[0-9]*)\s*[€€]\s*$/i
    ];

    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match) {
        const amount = this.parsePrice(match[1]);
        if (amount && amount > 0) {
          return amount;
        }
      }
    }

    return null;
  }

  extractDate(line) {
    const datePatterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}\.\d{2}\.\d{4})/,
      /(\d{2}\/\d{2}\/\d{4})/,
      /dat\.\s*(\d{2}\.\d{2}\.\d{4})/i,
      /date:\s*(\d{2}\.\d{2}\.\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  extractItem(line) {
    if (this.isHeaderOrTotal(line)) {
      return null;
    }

    const itemPatterns = [
      /(.+?)\s+(\d+)x?\s*[€€]\s*([0-9]+[.,]?[0-9]*)/i,
      /(.+?)\s+[€€]\s*([0-9]+[.,]?[0-9]*)/i,
      /(.+?)\s+([0-9]+[.,]?[0-9]*)\s*[€€]/i
    ];

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const productName = match[1].trim();
        const quantity = match[2] ? parseInt(match[2]) : 1;
        const price = this.parsePrice(match[3] ? match[3] : match[2]);
        
        if (productName && price && price > 0) {
          return {
            product_name: productName,
            quantity: quantity,
            unit_price: price / quantity,
            total_price: price,
            category: null,
            brand: this.extractBrand(productName),
            item_code: this.generateItemCode(productName),
            line_text: line,
            matched: false
          };
        }
      }
    }

    return null;
  }

  parsePrice(priceStr) {
    if (!priceStr) return null;
    
    // Remove currency symbols and spaces
    const cleanPrice = priceStr.replace(/[€€\s]/g, '').replace(',', '.');
    const price = parseFloat(cleanPrice);
    
    return isNaN(price) ? null : price;
  }

  extractBrand(productName) {
    // Simple brand extraction - look for common brand patterns
    const brandPatterns = [
      /^([A-Z]{2,4})\s/, // FF 3J, Odo1, etc.
      /^([A-Za-z]+)\s/, // Milka, Ricola, etc.
    ];
    
    for (const pattern of brandPatterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  generateItemCode(productName) {
    // Generate a simple item code based on product name
    const cleanName = productName.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const code = cleanName.substring(0, 8) + Math.random().toString(36).substring(2, 6).toUpperCase();
    return code;
  }

  isItemsSection(line) {
    const itemsKeywords = ['purchase items', 'items', 'artikel', 'produkte', 'waren'];
    const lowerLine = line.toLowerCase();
    
    return itemsKeywords.some(keyword => lowerLine.includes(keyword));
  }

  isHeaderOrTotal(line) {
    const headerKeywords = ['total', 'summe', 'gesamt', 'kasse', 'kassierer', 'bon', 'receipt', 'datum', 'date', 'payment', 'steuer', 'mwst'];
    const lowerLine = line.toLowerCase();
    
    return headerKeywords.some(keyword => lowerLine.includes(keyword));
  }

  // New fallback method for extracting items when structured parsing fails
  extractItemsFallback(markdown, result) {
    console.log('🔍 Using fallback item extraction...');
    
    // Look for any line that might contain product information
    const lines = markdown.split('\n');
    const potentialItems = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip headers, totals, and empty lines
      if (!trimmedLine || this.isHeaderOrTotal(trimmedLine)) continue;
      
      // Look for patterns that might be items
      const itemPatterns = [
        // Pattern: "PRODUCT quantity price"
        /^([A-ZÄÖÜß\s\-\.]+)\s+(\d+)\s+([0-9,\.]+)/i,
        // Pattern: "PRODUCT price"
        /^([A-ZÄÖÜß\s\-\.]+)\s+([0-9,\.]+)/i,
        // Pattern: "PRODUCT" (just the name)
        /^([A-ZÄÖÜß\s\-\.]{3,})$/i
      ];
      
      for (const pattern of itemPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const productName = match[1].trim();
          
          // Skip if it's clearly not a product
          if (this.isNotAProduct(productName)) continue;
          
          const quantity = match[2] ? parseInt(match[2]) : 1;
          const price = match[3] ? this.parsePrice(match[3]) : null;
          
          potentialItems.push({
            product_name: productName,
            quantity: quantity,
            unit_price: price ? price / quantity : null,
            total_price: price || null,
            category: null,
            brand: this.extractBrand(productName),
            item_code: this.generateItemCode(productName),
            line_text: trimmedLine,
            matched: false
          });
          
          break; // Found a match, move to next line
        }
      }
    }
    
    // Add unique items (avoid duplicates)
    const seenNames = new Set();
    for (const item of potentialItems) {
      if (!seenNames.has(item.product_name.toLowerCase())) {
        result.receipt.items.push(item);
        seenNames.add(item.product_name.toLowerCase());
      }
    }
    
    console.log(`✅ Fallback extraction found ${result.receipt.items.length} items`);
  }

  // Helper method to identify lines that are clearly not products
  isNotAProduct(text) {
    const notProducts = [
      'total', 'summe', 'sum', 'payment', 'cash', 'card', 'change', 'rueckgeld',
      'tax', 'vat', 'mwst', 'discount', 'date', 'time', 'store', 'address',
      'phone', 'website', 'thank', 'danke', 'receipt', 'bon', 'kas', 'terminal',
      'steuer', 'fiscal', 'loyalty', 'treue', 'points', 'eur', 'euro', 'amount',
      'method', 'eft', 'credit', 'debit', 'change', 'cashier', 'register'
    ];
    
    const lowerText = text.toLowerCase();
    return notProducts.some(term => lowerText.includes(term));
  }
}

module.exports = OCRService; 
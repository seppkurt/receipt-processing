# Receipt Processing Workflow Documentation

## System Overview

The receipt processing system consists of several interconnected components that work together to extract, parse, and store receipt data from uploaded images.

## Architecture Components

### 1. Frontend (Browser)
- **Technology**: HTML, CSS, JavaScript
- **Location**: `src/public/`
- **Purpose**: User interface for uploading receipt images and displaying results
- **Key Files**:
  - `index.html` - Main upload interface
  - `script.js` - Frontend logic for file handling and API communication
  - `style.css` - Styling

### 2. Backend Server (Node.js/Express)
- **Technology**: Node.js, Express.js
- **Location**: `src/server.js`, `src/routes/api.js`
- **Purpose**: HTTP server, request handling, file upload processing
- **Key Responsibilities**:
  - Serve static files (frontend)
  - Handle file uploads via multer
  - Route API requests
  - Coordinate between OCR service and database

### 3. OCR Service (Llama OCR)
- **Technology**: llama-ocr package, Together AI API
- **Location**: `src/services/ocr.js`
- **Purpose**: Extract text from receipt images
- **Key Responsibilities**:
  - Process images with Llama-3.2-11B-Vision model
  - Convert images to markdown text
  - Parse markdown into structured data
  - Return standardized JSON format

### 4. Database Service (SQLite)
- **Technology**: SQLite3, custom service layer
- **Location**: `src/services/database.js`
- **Purpose**: Store and retrieve receipt data
- **Key Responsibilities**:
  - Initialize database schema
  - Store receipt metadata
  - Store individual items
  - Provide query interfaces

## Complete Workflow

### Step 1: Image Upload
```
User → Frontend → Backend Server
```
1. User selects receipt image in browser
2. Frontend JavaScript creates FormData with image
3. Frontend sends POST request to `/api/process-receipt`
4. Backend receives request via Express.js

### Step 2: File Processing
```
Backend Server → Multer → Temporary Storage
```
1. Express routes request to API handler
2. Multer middleware processes multipart form data
3. Image file saved to temporary location (`uploads/`)
4. File metadata passed to route handler

### Step 3: OCR Processing
```
Backend Server → OCR Service → Together AI API
```
1. Backend calls `ocr.processImage(filePath)`
2. OCR service reads image file
3. OCR service calls Together AI API with image
4. Together AI returns markdown text
5. OCR service parses markdown into structured data
6. OCR service returns standardized JSON result

### Step 4: Data Parsing
```
OCR Service → Structured Data
```
1. Raw markdown text from API
2. Parse markdown for:
   - Store information (name, address, etc.)
   - Receipt metadata (date, time, receipt number)
   - Individual items (product name, quantity, price)
   - Totals and payment information
   - Additional details (cashier, fiscal info, etc.)
3. Return standardized JSON structure

### Step 5: Database Storage
```
Backend Server → Database Service → SQLite
```
1. Backend receives parsed data from OCR service
2. Backend calls database service methods
3. Database service stores:
   - Receipt record (metadata, totals, store info)
   - Individual item records (linked to receipt)
4. Database service returns receipt ID

### Step 6: Response Generation
```
Backend Server → Frontend → User
```
1. Backend constructs response JSON
2. Response includes:
   - Parsed receipt data
   - Raw OCR data (for debugging)
   - Processing metadata
   - Receipt ID from database
3. Backend sends response to frontend
4. Frontend displays results to user

## Data Flow Diagram

```
[User Upload] → [Frontend] → [Backend Server]
                                    ↓
[OCR Service] ← [File Processing] ← [Multer]
                                    ↓
[Together AI] ← [Image Analysis] ← [OCR Service]
                                    ↓
[Data Parsing] ← [Markdown Text] ← [API Response]
                                    ↓
[Database Service] ← [Structured Data] ← [Parsed Result]
                                    ↓
[SQLite Database] ← [Storage Operations] ← [Database Service]
                                    ↓
[Response JSON] ← [Result Assembly] ← [Backend Server]
                                    ↓
[User Display] ← [Frontend] ← [Response]
```

## Data Structures

### OCR Service Output
```json
{
  "receipt": {
    "metadata": {
      "date": "2024-01-15",
      "time": "14:30",
      "receipt_number": "12345",
      "transaction_id": null
    },
    "store": {
      "name": "EDEKA",
      "address": "123 Main St",
      "phone": "+49 30 123456",
      "tax_id": "DE123456789",
      "store_chain": "EDEKA"
    },
    "items": [
      {
        "product_name": "Milk",
        "quantity": 2,
        "unit_price": 1.50,
        "total_price": 3.00,
        "brand": "EDEKA",
        "item_code": "MLK001",
        "line_text": "Milk 2x €1.50",
        "matched": false
      }
    ],
    "totals": {
      "subtotal": 15.00,
      "vat_amount": 2.85,
      "vat_rate": 19,
      "total_amount": 17.85,
      "currency": "EUR"
    },
    "payment": {
      "method": "Card",
      "amount_paid": 17.85,
      "change": 0.00,
      "card_type": "Visa",
      "card_number": null
    }
  },
  "ocr_data": {
    "raw_markdown": "# Receipt\n\n## Items\n* Milk 2x €1.50\n...",
    "confidence_score": null,
    "processing_time": null
  },
  "processing_info": {
    "timestamp": "2024-01-15T14:30:00Z",
    "version": "1.0.0",
    "ocr_model": "Llama-3.2-11B-Vision",
    "parser_version": "1.0.0"
  }
}
```

### Database Schema
```sql
-- Receipts table
CREATE TABLE receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_name TEXT,
  store_address TEXT,
  store_phone TEXT,
  store_tax_id TEXT,
  store_chain TEXT,
  receipt_date TEXT,
  receipt_time TEXT,
  receipt_number TEXT,
  transaction_id TEXT,
  total_amount REAL,
  currency TEXT,
  payment_method TEXT,
  amount_paid REAL,
  change_amount REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Items table
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id INTEGER,
  product_name TEXT,
  quantity REAL,
  unit_price REAL,
  total_price REAL,
  brand TEXT,
  item_code TEXT,
  line_text TEXT,
  matched BOOLEAN DEFAULT 0,
  matched_product_id INTEGER,
  confidence_score REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES receipts (id)
);
```

## Error Handling

### Common Error Points
1. **File Upload**: Invalid file type, file too large
2. **OCR Processing**: API key issues, network problems, image quality
3. **Data Parsing**: Unrecognized receipt format, missing data
4. **Database Storage**: Schema issues, constraint violations

### Error Response Format
```json
{
  "error": "Error description",
  "details": "Additional error information",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

## Configuration

### Environment Variables
- `TOGETHER_API_KEY`: Together AI API key for OCR
- `PORT`: Server port (default: 3000)
- `DATABASE_PATH`: SQLite database file path

### Dependencies
- `express`: Web server framework
- `multer`: File upload middleware
- `llama-ocr`: OCR processing
- `sqlite3`: Database operations
- `cors`: Cross-origin resource sharing

## Testing Strategy

### Unit Tests
- OCR service parsing functions
- Database service operations
- API route handlers

### Integration Tests
- End-to-end receipt processing
- File upload to database storage
- Error handling scenarios

### Manual Testing
- Upload various receipt formats
- Test with different image qualities
- Verify database storage accuracy 
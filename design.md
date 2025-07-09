# Receipt Processing Web Service Design (Simplified)

## System Overview
1. Frontend (Web Application) - Single page app
2. Backend (API Service) - Node.js/Express
3. Database - SQLite (file-based, no external DB needed)
4. OCR Service Integration - Llama OCR via Together AI
5. Docker Container - All-in-one deployment

## Simplified Architecture

### Frontend Components
1. **Main Page (Single Page)**
   - Upload receipt form (drag & drop or file picker)
   - Processing status indicator
   - Results display with:
     - Receipt total
     - Itemized list with categories, brands, prices
     - Purchase date (if found)
   - Option to upload another receipt

### Backend Architecture
1. **API Endpoints:**
   - `POST /api/process-receipt` - Upload and process receipt
   - `GET /api/health` - Health check

2. **Simplified Database Schema:**
   ```
   Receipts
     - id (auto-increment)
     - receipt_sum (total amount)
     - purchase_date (nullable)
     - created_at
     - status (pending/processed/error)

   ReceiptItems
     - id
     - receipt_id
     - item_code
     - quantity
     - price
     - line_text
     - category
     - brand

   ItemCodes (for matching)
     - code
     - category
     - brand
     - product_name
     - description
   ```

## Technical Stack

### Docker Setup
- **Base Image:** Node.js 18 Alpine
- **Database:** SQLite (file-based, no external service)
- **Web Server:** Express.js
- **Frontend:** Static HTML/CSS/JS (served by Express)
- **Port:** 3000 (configurable)

### Dependencies
- **Backend:** Express, Multer (file upload), SQLite3, Llama-OCR
- **Frontend:** Vanilla JS, no frameworks
- **OCR:** Together AI API (Llama OCR)

## Processing Workflow

1. **Upload Phase:**
   - User selects receipt image
   - Frontend shows upload progress
   - Image sent to backend

2. **OCR Processing:**
   - Backend sends image to Llama OCR
   - Receives markdown response
   - Parses markdown into structured data

3. **Data Matching:**
   - Match items against local ItemCodes database
   - Extract totals and dates
   - Return structured results

4. **Display Results:**
   - Show receipt total
   - Display itemized list
   - Show unmatched items for manual review

## Docker Configuration

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  receipt-processor:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # SQLite database
    environment:
      - NODE_ENV=production
      - TOGETHER_API_KEY=${TOGETHER_API_KEY}
```

## File Structure
```
receipt-processor/
├── Dockerfile
├── docker-compose.yml
├── package.json
├── .env.example
├── src/
│   ├── server.js
│   ├── routes/
│   │   └── api.js
│   ├── services/
│   │   ├── ocr.js
│   │   └── database.js
│   └── public/
│       ├── index.html
│       ├── style.css
│       └── script.js
├── data/
│   └── receipts.db
└── README.md
```

## Environment Variables
- `TOGETHER_API_KEY` - Together AI API key for Llama OCR
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Deployment on Synology NAS

1. **Build and Deploy:**
   ```bash
   # On development machine
   docker build -t receipt-processor .
   docker save receipt-processor | gzip > receipt-processor.tar.gz
   
   # Transfer to Synology and load
   docker load < receipt-processor.tar.gz
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Access:** `http://your-nas-ip:3000`

## Next Steps for Implementation

1. **Set up project structure**
2. **Create basic Express server**
3. **Implement file upload endpoint**
4. **Integrate Llama OCR**
5. **Create SQLite database schema**
6. **Build simple frontend**
7. **Test with sample receipts**
8. **Deploy to Synology NAS**

## Development Conversation Prompts

### Simplified System Design
- Single-page web app for receipt processing
- No user authentication required
- No image storage (process and discard)
- Docker deployment on Synology NAS
- SQLite database for simplicity
- Llama OCR for text extraction
- Local item code matching system 
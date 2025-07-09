# 🧾 Receipt Processor

> A modern web application for processing supermarket receipts using OCR (Optical Character Recognition) to extract and categorize items, brands, prices, and totals.

[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)](https://docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-API-red?logo=express)](https://expressjs.com)
[![SQLite](https://img.shields.io/badge/SQLite-Database-yellow?logo=sqlite)](https://sqlite.org)

## ✨ Features

- 📸 **Smart Upload**: Drag & drop or file picker for receipt images
- 🔍 **OCR Processing**: Extract text from receipt images (currently using mock data)
- 📊 **Data Extraction**: Parse items, prices, categories, brands, and totals
- 🗄️ **Database Storage**: SQLite database for receipt and item data
- 🎨 **Modern UI**: Responsive web interface with real-time processing status
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose
- 🚀 **NAS Ready**: Optimized for Synology NAS deployment

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   📱 Frontend   │    │   🔧 Backend    │    │   🗄️ Database   │
│                 │    │                 │    │                 │
│ • HTML/CSS/JS   │◄──►│ • Node.js       │◄──►│ • SQLite        │
│ • Drag & Drop   │    │ • Express API   │    │ • File-based    │
│ • Real-time UI  │    │ • File Upload   │    │ • Persistent    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   🔍 OCR        │
                       │                 │
                       │ • Llama OCR     │
                       │ • Together AI   │
                       │ • Mock Mode     │
                       └─────────────────┘
```

## 🚀 Quick Start (Development)

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Set Up Environment
```bash
cp .env.example .env
# Edit .env and add your Together AI API key (optional for now)
```

### 3️⃣ Start the Server
```bash
npm start
```

### 4️⃣ Access Application
Open your browser and go to `http://localhost:3000`

## 🐳 Docker Deployment (Production)

### 🧪 Local Testing
```bash
# Build the Docker image
docker build -t receipt-processor .

# Test locally
docker run -d -p 3000:3000 --name receipt-processor-test receipt-processor

# Access: http://localhost:3000
```

### 🏠 Synology NAS Deployment

#### Option A: Build on NAS (Recommended)
Copy these files to your Synology NAS:
- 📁 Entire project folder (all source files)
- ⚙️ `docker-compose.yml`
- 🚀 `deploy-nas.sh`

Then deploy:
```bash
# Make sure Docker and Docker Compose are installed on your NAS
chmod +x deploy-nas.sh
./deploy-nas.sh
```

#### Option B: Pre-built Image (Alternative)
If you prefer to use the pre-built image:

1. **Prepare Image for Transfer:**
   ```bash
   docker save receipt-processor | gzip > receipt-processor.tar.gz
   ```

2. **Transfer Files to NAS:**
   - 📦 `receipt-processor.tar.gz`
   - ⚙️ `docker-compose.yml` (use the image version)
   - 🚀 `deploy.sh`

3. **Deploy on NAS:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

#### Access Application
Open your browser and go to `http://your-nas-ip:3000`

### 🔧 Manual Deployment Steps

If you prefer to deploy manually:

```bash
# Load the image
docker load < receipt-processor.tar.gz

# Create data directory
mkdir -p data

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | 🏠 Main application page |
| `GET` | `/health` | 💚 Health check endpoint |
| `POST` | `/api/process-receipt` | 📤 Upload and process receipt image |

## 🗃️ Database Schema

### 📋 Receipts Table
```sql
- id (auto-increment)
- receipt_sum (total amount)
- purchase_date (nullable)
- created_at
- status (pending/processed/error)
```

### 🛒 ReceiptItems Table
```sql
- id
- receipt_id
- item_code
- quantity
- price
- line_text
- category
- brand
```

### 🏷️ ItemCodes Table
```sql
- code
- category
- brand
- product_name
- description
```

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `production` |
| `TOGETHER_API_KEY` | Together AI API key for OCR | `optional` |

## 📈 Development Status

### ✅ Completed
- [x] Basic application structure
- [x] File upload functionality
- [x] Database schema and operations
- [x] Mock OCR processing
- [x] Docker containerization
- [x] Frontend interface
- [x] Health check endpoint
- [x] Deployment scripts

### ⏳ In Progress
- [ ] Real OCR integration (using mock data for now)

### 🔮 Next Steps
1. 🔍 Integrate real Llama OCR service
2. 🎯 Improve item code matching
3. 💾 Add receipt image storage
4. 🔐 Implement user authentication
5. 📊 Add receipt history and analytics

## 🛠️ Troubleshooting

### 🐳 Docker Issues
- **Segmentation fault**: Use the Debian-based image (node:18-slim) instead of Alpine
- **Permission denied**: Make sure you're in the docker group and have proper permissions

### 🗄️ Database Issues
- **SQLite errors**: Ensure the `data` directory exists and is writable
- **Connection issues**: Check file permissions and disk space

### 🔍 OCR Issues
- **API key required**: Currently using mock data, real OCR requires Together AI API key
- **Processing errors**: Check network connectivity and API limits

## 📁 Project Structure

```
receipt-processor/
├── 📦 Dockerfile
├── 🐳 docker-compose.yml
├── 🚀 deploy.sh
├── 📋 package.json
├── 📖 README.md
├── 📁 src/
│   ├── 🖥️ server.js
│   ├── 🛣️ routes/
│   │   └── 🔌 api.js
│   ├── 🔧 services/
│   │   ├── 🔍 ocr.js
│   │   └── 🗄️ database.js
│   └── 🌐 public/
│       ├── 📄 index.html
│       ├── 🎨 style.css
│       └── ⚡ script.js
└── 📁 data/
    └── 🗄️ receipts.db
```

## 🤝 Contributing

1. 🍴 Fork the repository
2. 🌿 Create a feature branch
3. ✏️ Make your changes
4. 🧪 Test thoroughly
5. 📤 Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Made with ❤️ for receipt processing**

[🏠 Home](#-receipt-processor) • [🚀 Quick Start](#-quick-start-development) • [🐳 Docker](#-docker-deployment-production)

</div> 
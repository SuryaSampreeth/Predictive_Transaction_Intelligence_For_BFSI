# 🚀 Quick Start Guide - TransIntelliFlow

## Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB Atlas account (credentials provided)

---

## 📦 Installation

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Verify .env file exists with:
# - MONGODB_URL (MongoDB Atlas connection string)
# - GEMINI_API_KEY (Google AI API key)
# - CORS_ORIGINS (comma-separated allowed origins)

# Start FastAPI server
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**
API docs: **http://localhost:8000/docs**

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## 🎯 Accessing the Application

### Step 1: Open Browser
Navigate to: **http://localhost:5173**

### Step 2: Login (Mock Authentication)
- **Username**: Enter any value (e.g., "admin")
- **Employee ID**: Enter any value (e.g., "EMP001")
- **Role**: Select from dropdown:
  - **Administrator** - Full access to all screens including Admin & Health
  - **Analyst** - Access to analytics, cases, and monitoring
  - **Manager** - Access to dashboards and reports

Click **Sign In**

### Step 3: Explore Screens

#### **Core Workflows**

1. **Home Dashboard** (`/dashboard`)
   - View fraud metrics overview
   - Check recent alerts
   - Monitor 7-day fraud trends

2. **Model Testing** (`/predict`)
   - Enter transaction details
   - Get instant fraud prediction
   - View AI explanation from Gemini

3. **Batch Prediction** (`/batch-prediction`)
   - Download CSV template
   - Upload transaction batch
   - Export results with risk scores

4. **Simulation Lab** (`/simulation-lab`)
   - Click "Run Simulation"
   - Test 100 transactions concurrently
   - View risk distribution chart

5. **Case Management** (`/cases`)
   - Create new fraud investigation case
   - View case details in tabs
   - Get AI recommendations for investigation

6. **Monitoring Wall** (`/monitoring`)
   - Watch real-time alert stream
   - Monitor live transactions
   - Check system health metrics

---

## 🧪 Testing Features

### Test Transaction (High Risk)
```json
{
  "amount": 5000,
  "merchant_category": "Electronics",
  "transaction_type": "online",
  "location": "International",
  "time_of_day": "Late Night",
  "device_type": "New Device"
}
```

### Test Transaction (Low Risk)
```json
{
  "amount": 50,
  "merchant_category": "Grocery",
  "transaction_type": "in-store",
  "location": "Local",
  "time_of_day": "Afternoon",
  "device_type": "Registered Device"
}
```

### CSV Template for Batch Upload
Download from Batch Prediction screen or create:
```csv
transaction_id,amount,merchant_name,merchant_category,transaction_type,location,customer_age,account_age_days
TXN001,150.00,Amazon,Electronics,online,USA,35,365
TXN002,25.00,Starbucks,Food,in-store,USA,28,180
TXN003,2500.00,Unknown,Electronics,online,Nigeria,45,5
```

---

## 📊 API Endpoints

### Core Prediction
- `POST /predict` - Single transaction prediction
- `POST /predict-batch` - Batch CSV upload prediction

### Settings
- `GET /api/settings/model-thresholds`
- `PUT /api/settings/model-thresholds`
- `GET /api/settings/notification-rules`
- `PUT /api/settings/notification-rules`

### Case Management
- `GET /api/cases` - List cases
- `POST /api/cases` - Create case
- `GET /api/cases/{id}` - Get case details
- `PUT /api/cases/{id}` - Update case
- `GET /api/cases/{id}/recommendations` - AI recommendations

### Modeling
- `POST /api/modeling/training/start` - Start training job
- `GET /api/modeling/training/{job_id}` - Job status
- `GET /api/modeling/feature-importance` - Feature scores
- `POST /api/modeling/explain/model` - Gemini model explanation
- `POST /api/modeling/explain/prediction` - Explain prediction

### Monitoring
- `GET /api/monitoring/alerts/stream` - Real-time alerts
- `GET /api/monitoring/system-health` - System metrics
- `GET /api/monitoring/transactions/live` - Live transactions

### Simulation
- `POST /api/simulation/batch` - Run concurrent batch simulation

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# MongoDB Atlas
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
DATABASE_NAME=fraud_detection_db

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
MODEL_VERSION=1.0.0

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

---

## 🐛 Troubleshooting

### Backend Issues

#### Error: "No module named 'motor'"
```bash
pip install motor pymongo dnspython
```

#### Error: "No module named 'google.generativeai'"
```bash
pip install google-generativeai
```

#### Error: "Model file not found"
- Verify `backend/final_fraud_model/best_model.pkl` exists
- Check file path in `src/api/main.py` (should be relative to backend root)

#### Error: MongoDB connection failed
- Verify MONGODB_URL in .env
- Check network connectivity to MongoDB Atlas
- Ensure IP whitelist in MongoDB Atlas includes your IP

### Frontend Issues

#### Error: "npm install failed"
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Error: "Port 5173 already in use"
```bash
# Kill process on port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 3000
```

#### Error: API calls failing (CORS errors)
- Verify backend is running on http://localhost:8000
- Check CORS_ORIGINS in backend .env includes http://localhost:5173
- Restart backend after changing .env

---

## 📚 Screen Navigation

### Navigation Menu (Left Sidebar)

| Screen | Path | Description | Role Access |
|--------|------|-------------|-------------|
| Home Dashboard | `/dashboard` | Metrics overview | All |
| Analytics & Reports | `/analytics` | Charts and exports | All |
| Batch Predictions | `/batch-prediction` | CSV upload | All |
| Simulation Lab | `/simulation-lab` | Stress testing | All |
| Model Testing | `/predict` | Single prediction | All |
| Modeling Workspace | `/modeling` | Training jobs | All |
| Transaction Search | `/search` | Advanced search | All |
| Customer 360 | `/customer360` | Customer profiles | All |
| Case Management | `/cases` | Investigation cases | All |
| Monitoring Wall | `/monitoring` | Real-time feed | All |
| Settings | `/settings` | Configuration | All |
| Admin & Health | `/admin` | System health | Admin only |

---

## 💡 Tips & Best Practices

### Performance Optimization
1. **Auto-Refresh**: Monitoring Wall auto-refreshes every 5-15 seconds
2. **Batch Processing**: Use Batch Prediction for >10 transactions
3. **Simulation Lab**: Use for stress testing before production deployment

### Data Management
1. **Export Results**: All data tables have CSV export functionality
2. **Case Documentation**: Use Case Management to track investigations
3. **Search Filters**: Use Transaction Search for historical analysis

### AI Features
1. **Gemini Explanations**: Available in Model Testing and Case Management
2. **Pattern Insights**: Ask for recommendations in case detail view
3. **Model Explainability**: Check Modeling Workspace for feature importance

---

## 🎯 Demo Scenarios

### Scenario 1: Fraud Detection Workflow
1. Go to **Model Testing** (`/predict`)
2. Enter high-risk transaction (large amount, international, new device)
3. View fraud prediction and AI explanation
4. Go to **Case Management** (`/cases`)
5. Click "Create New Case" and reference transaction
6. View AI recommendations for investigation

### Scenario 2: Batch Analysis
1. Go to **Batch Prediction** (`/batch-prediction`)
2. Click "Download CSV Template"
3. Fill in 10 sample transactions
4. Upload CSV file
5. Wait for processing
6. Export results with risk scores

### Scenario 3: System Monitoring
1. Go to **Monitoring Wall** (`/monitoring`)
2. Toggle auto-refresh ON
3. Watch real-time alert stream
4. Check system health metrics
5. View live transaction feed

### Scenario 4: Model Training
1. Go to **Modeling Workspace** (`/modeling`)
2. Click "Start Training"
3. Monitor job progress in Training Jobs tab
4. View performance metrics upon completion
5. Check Feature Importance tab for top features
6. Read Gemini explanation in Explainability tab

---

## 📞 Support

### Resources
- **API Documentation**: http://localhost:8000/docs
- **Implementation Summary**: See `IMPLEMENTATION_SUMMARY.md`
- **Code Comments**: Inline documentation in source files

### Common Questions

**Q: Can I use real MongoDB data?**
A: Yes! Update MONGODB_URL in .env to your MongoDB Atlas cluster. Schema is defined in `backend/src/database/models.py`

**Q: How do I add new users?**
A: Current version uses mock auth. For production, implement user management in Admin & Health screen with database persistence.

**Q: Can I deploy to cloud?**
A: Yes! Backend can deploy to AWS/Azure/GCP with Docker. Frontend can deploy to Vercel/Netlify. Update CORS_ORIGINS accordingly.

**Q: How do I retrain the model?**
A: Use Modeling Workspace to start training jobs. For actual retraining, run `backend/scripts/train_model.py` with new data.

---

**Last Updated**: 2025-01-28
**Version**: 1.0.0
**Status**: Production-Ready

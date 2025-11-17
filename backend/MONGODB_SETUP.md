# MongoDB Database Setup - TransIntelliFlow

## ✅ Completed Setup

Your MongoDB Atlas database has been successfully configured and populated with transaction data!

### 📊 Database Overview

- **Connection**: MongoDB Atlas (Cloud)
- **Database Name**: `fraud_detection_db`
- **Collections**: 
  - `transactions` - Historical transaction data (5000 records)
  - `predictions` - ML model predictions
  - `model_metrics` - Model performance tracking

### 📈 Database Statistics

- **Total Transactions**: 5,000
- **Fraud Transactions**: 432 (8.64%)
- **Legitimate Transactions**: 4,568 (91.36%)

## 🗂️ Database Schema

### Collection: `transactions`

```json
{
  "transaction_id": "TXN_200000",
  "customer_id": "CUST_799",
  "timestamp": "2024-01-15T10:30:00Z",
  "account_age_days": 1050,
  "transaction_amount": 5000.00,
  "channel": "Mobile",
  "kyc_verified": "Yes",
  "is_fraud": 0,
  "hour": 10,
  "weekday": 1,
  "month": 1,
  "is_high_value": 1,
  "transaction_amount_log": 8.517,
  "created_at": "2024-11-14T12:39:50Z",
  "updated_at": "2024-11-14T12:39:50Z"
}
```

**Indexes Created**:
- `transaction_id` (unique)
- `customer_id`
- `timestamp` (descending)
- `is_fraud`
- `channel`
- `kyc_verified`
- `hour`, `weekday`
- Compound: `(is_fraud, channel)`
- Compound: `(customer_id, timestamp)`

### Collection: `predictions`

```json
{
  "transaction_id": "TXN_200000",
  "prediction": "Fraud",
  "fraud_probability": 0.85,
  "risk_level": "High",
  "model_version": "1.0.0",
  "predicted_at": "2024-11-14T12:40:00Z"
}
```

**Indexes Created**:
- `transaction_id` (unique)
- `predicted_at` (descending)
- `risk_level`

### Collection: `model_metrics`

```json
{
  "model_version": "1.0.0",
  "accuracy": 0.9534,
  "precision": 0.8912,
  "recall": 0.8756,
  "f1_score": 0.8833,
  "roc_auc": 0.92,
  "created_at": "2024-11-14T12:40:02Z"
}
```

**Indexes Created**:
- `model_version`
- `created_at` (descending)

## 🔌 API Endpoints

Your FastAPI backend now includes these new database endpoints:

### Transaction Endpoints

```bash
# Get list of transactions with pagination
GET http://localhost:8000/api/transactions?skip=0&limit=100&is_fraud=0&channel=Mobile

# Get specific transaction
GET http://localhost:8000/api/transactions/TXN_200000
```

### Statistics Endpoints

```bash
# Overall fraud statistics
GET http://localhost:8000/api/statistics/fraud

# Channel-wise statistics
GET http://localhost:8000/api/statistics/channels

# Hourly statistics
GET http://localhost:8000/api/statistics/hourly
```

### Model Metrics Endpoints

```bash
# Get latest model metrics
GET http://localhost:8000/api/metrics

# Get metrics history
GET http://localhost:8000/api/metrics/history

# Save new metrics
POST http://localhost:8000/api/metrics
```

### Health Check

```bash
GET http://localhost:8000/health
```

## 🚀 Testing the API

### Using cURL:

```bash
# Get fraud statistics
curl http://localhost:8000/api/statistics/fraud

# Get channel statistics
curl http://localhost:8000/api/statistics/channels

# Get transactions
curl "http://localhost:8000/api/transactions?limit=10"

# Health check
curl http://localhost:8000/health
```

### Using Python:

```python
import requests

# Get fraud statistics
response = requests.get("http://localhost:8000/api/statistics/fraud")
print(response.json())

# Get transactions
response = requests.get("http://localhost:8000/api/transactions", params={"limit": 10})
print(response.json())
```

### Using Browser:

Simply open these URLs in your browser:
- http://localhost:8000/api/statistics/fraud
- http://localhost:8000/api/statistics/channels
- http://localhost:8000/api/transactions?limit=10
- http://localhost:8000/docs (Interactive API documentation)

## 📁 File Structure

```
backend/
├── .env                          # Environment variables (MongoDB connection)
├── requirements.txt              # Updated with pymongo & motor
├── src/
│   ├── database/                 # NEW: Database module
│   │   ├── __init__.py          # Package exports
│   │   ├── config.py            # MongoDB connection config
│   │   ├── models.py            # Pydantic schemas
│   │   └── operations.py        # CRUD operations
│   └── api/
│       └── main.py              # Updated with DB endpoints
└── scripts/
    └── import_csv_to_mongodb.py # CSV import script
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
MONGODB_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
DATABASE_NAME=fraud_detection_db
MODEL_VERSION=1.0.0
API_HOST=0.0.0.0
API_PORT=8000
```

## 📊 Sample Queries

### Get Fraud Rate by Channel:

```python
import requests

response = requests.get("http://localhost:8000/api/statistics/channels")
channels = response.json()

for channel in channels:
    print(f"{channel['channel']}: {channel['fraud_rate']:.2f}% fraud rate")
```

### Get Recent Fraud Transactions:

```python
response = requests.get(
    "http://localhost:8000/api/transactions",
    params={"is_fraud": 1, "limit": 10}
)
frauds = response.json()
print(f"Found {frauds['total']} fraud transactions")
```

## 🎯 Next Steps

1. **Frontend Integration**: Update React components to fetch data from MongoDB APIs
2. **Real-time Updates**: Add WebSocket support for live transaction monitoring
3. **Advanced Analytics**: Create aggregation pipelines for complex queries
4. **Data Visualization**: Connect frontend charts to MongoDB statistics endpoints
5. **User Authentication**: Add JWT-based auth for secure API access

## 📚 MongoDB Atlas Dashboard

Access your database directly at:
https://cloud.mongodb.com/

## 🛠️ Maintenance Commands

### Re-import Data:
```bash
python backend/scripts/import_csv_to_mongodb.py
```

### Check Database Connection:
```bash
curl http://localhost:8000/health
```

### View API Documentation:
```
http://localhost:8000/docs
```

## ✨ Features Implemented

✅ MongoDB Atlas cloud connection
✅ Async database operations with Motor
✅ Complete CRUD operations
✅ Indexed collections for performance
✅ Transaction pagination and filtering
✅ Fraud statistics and analytics
✅ Channel-wise analysis
✅ Model metrics tracking
✅ Health monitoring
✅ CORS enabled for frontend
✅ Auto-documentation with FastAPI

## 🎉 Success!

Your MongoDB database is now fully integrated with the fraud detection system. The backend API is running at **http://localhost:8000** with complete database functionality!

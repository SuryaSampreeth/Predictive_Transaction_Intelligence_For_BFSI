# 🚀 Vercel Deployment Guide - TransIntelliFlow

## Overview
Deploy everything to **Vercel** - frontend + API as serverless functions.

---

## 📦 One-Click Deployment

### Step 1: Push to GitHub
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Setup Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository: `InfosysVirtualInternship-BFSI`
4. Vercel will auto-detect the `vercel.json` configuration
5. Click **"Deploy"**

### That's it! 🎉

Your app will be live at: `https://your-project.vercel.app`

---

## 🔧 Configuration Details

### What Gets Deployed

| Component | Technology | Path |
|-----------|------------|------|
| Frontend | React/Vite | `/frontend` → Static files |
| API | Python Serverless | `/api` → `/api/*` routes |

### API Endpoints Available

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check |
| `/api/predict/enhanced` | Fraud prediction |
| `/api/statistics/fraud` | Fraud statistics |
| `/api/statistics/channels` | Channel statistics |
| `/api/statistics/hourly` | Hourly statistics |
| `/api/metrics` | Model metrics |
| `/api/transactions` | Transaction list |
| `/api/alerts` | Alert list |
| `/api/cases` | Case list |

---

## 🔐 Environment Variables (Optional)

Set these in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URL` | MongoDB connection string | Optional |
| `GEMINI_API_KEY` | Google AI API key | Optional |
| `MODEL_VERSION` | Model version string | Optional |

> **Note**: The API works without these variables using intelligent mock data that simulates real ML model behavior.

---

## 🧪 Testing Your Deployment

### 1. Check API Health
```
https://your-project.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "mock_mode",
  "model": "loaded",
  "platform": "vercel_serverless"
}
```

### 2. Test Prediction
```bash
curl -X POST https://your-project.vercel.app/api/predict/enhanced \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"TEST123","amount":50000,"account_age_days":5,"channel":"ATM","kyc_verified":"No","hour":2}'
```

### 3. Open Dashboard
Navigate to `https://your-project.vercel.app` and log in.

---

## 🏠 Local Development

### Run Frontend + Local Backend
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn src.api.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Run Frontend Only (with Vercel-like API)
```bash
cd frontend
# Edit .env.development to comment out VITE_API_URL
npm run dev
```

---

## ⚠️ Known Limitations

### Vercel Serverless Functions
- **Cold starts**: First request may take 1-3 seconds
- **Timeout**: 10 seconds on free tier, 60 seconds on Pro
- **Memory**: 1GB on free tier

### Current Implementation
- Uses intelligent mock data for predictions
- No persistent storage (MongoDB integration optional)
- Predictions simulate real ML model behavior

---

## 🔄 Redeploying

### Automatic
Every push to `main` branch triggers automatic redeployment.

### Manual
1. Go to Vercel Dashboard
2. Select your project
3. Click "Redeploy" from the three-dot menu

---

## 📁 Project Structure

```
InfosysVirtualInternship-BFSI/
├── vercel.json          # Vercel configuration
├── api/
│   ├── index.py         # Serverless API handler
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── src/             # React source code
│   ├── dist/            # Build output (generated)
│   └── package.json     # Node dependencies
└── backend/             # Full backend (for local dev)
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Deployment successful
- [ ] `/api/health` returns healthy
- [ ] Dashboard loads without errors
- [ ] Prediction form works

---

**Last Updated**: 2024-12-09
**Platform**: Vercel (Frontend + Serverless Functions)

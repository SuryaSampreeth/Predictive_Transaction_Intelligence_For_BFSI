# 🛡️ TransIntelliFlow - Fraud Detection System

<div align="center">

![Status](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18+-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688)
![License](https://img.shields.io/badge/License-MIT-yellow)

**AI-Powered Real-Time Fraud Detection for Banking & Financial Services**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API](#-api-endpoints) • [Contributing](#-contributing)

</div>

---

## 📖 Overview

**TransIntelliFlow** is an enterprise-grade fraud detection system that combines Machine Learning, AI-assisted explainability, and realistic simulations to identify fraudulent transactions in real-time for the Banking, Financial Services, and Insurance (BFSI) sector.

### 🎯 Key Capabilities
- **Real-time Fraud Detection** - Instant analysis of transactions via FastAPI
- **ML-Powered Predictions** - XGBoost & Random Forest models with cached mock fallback
- **Simulation Lab & Overlay** - Run 100+ what-if transactions and overlay the latest 500 results on the dashboard without breaking baselines
- **AI Explainability** - Gemini-powered narratives that summarize feature importance and per-transaction risk factors
- **Risk Scoring Engine** - Multi-factor risk assessment with heuristic boosters for demo realism
- **Interactive Dashboard** - React-based monitoring interface tuned for enterprise presentations
- **RESTful API** - Easily integrate with existing systems or experimentation notebooks

---

## 🏗️ Architecture

```
📦 TransIntelliFlow/
│
├── 🐍 backend/                    # Python Backend (FastAPI)
│   ├── src/
│   │   ├── preprocessing/         # Data cleaning & feature engineering
│   │   ├── modeling/              # ML model training & evaluation
│   │   ├── detection/             # Fraud detection engine
│   │   ├── api/                   # REST API endpoints
│   │   └── utils/                 # Helper functions
│   ├── data/
│   │   ├── raw/                   # Original datasets
│   │   └── processed/             # Cleaned datasets
│   ├── outputs/
│   │   ├── models/                # Trained ML models
│   │   └── eda_reports/           # Analysis reports
│   ├── notebooks/                 # Jupyter notebooks
│   ├── tests/                     # Unit tests
│   └── requirements.txt
│
├── ⚛️ frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── services/              # API integration
│   │   └── pages/                 # Application pages
│   ├── public/                    # Static assets
│   └── package.json
│
└── 📚 docs/                       # Documentation
```

---

## ✨ Features

### Backend Features
- 🔍 **Data Preprocessing Pipeline** - Automated data cleaning and transformation
- 📊 **Comprehensive EDA** - 8+ visualization reports with insights
- 🤖 **Multiple ML Models** - XGBoost, Random Forest with hyperparameter tuning
- ⚡ **Real-time Detection** - Sub-second fraud prediction
- 🎯 **Risk Scoring** - Multi-factor risk assessment (Low/Medium/High/Critical)
- 🚨 **Smart Alerting** - Automated alerts for suspicious transactions
- 📡 **RESTful API** - 6+ endpoints for seamless integration
- 💾 **Model Persistence** - Save and load trained models

### Frontend Features
- 📝 **Transaction Form** - Easy transaction submission
- 🎨 **Real-time Dashboard** - Live fraud detection results
- 📈 **Metrics Visualization** - Model performance charts
- 📋 **Transaction History** - Searchable transaction log
- 🎯 **Risk Indicators** - Visual risk level display
- 📱 **Responsive Design** - Works on all devices
- ⚠️ **Alert System** - Real-time fraud notifications
- 📧 **Email Alert Simulation** - Automated security alerts for high-risk transactions with recipient tracking
- 🧪 **Simulation Lab Overlay** - Blend the last 500 simulation transactions into the dashboard without disturbing the curated baseline dataset
- 🤝 **Modeling Workspace AI** - Gemini explains model metrics and per-transaction predictions directly inside the app
- 💬 **Feedback Loop** - Mark predictions as correct/incorrect for model improvement
- 🌙 **Dark Mode** - Full dark mode support across all screens

---

## 🔁 Demo Workflows

### Simulation Lab + Dashboard Overlay
1. Open the **Simulation Lab** screen in the frontend and submit a batch (default 100 transactions).
2. FastAPI processes every transaction with the real model, applies realistic heuristics (9–15% fraud), and stores the last 500 results in an in-memory overlay buffer.
3. The dashboard can optionally overlay this buffer to showcase live spikes while the baseline 200 curated transactions stay unchanged.
4. Backend endpoints involved:
  - `POST /api/simulation/batch`
  - `GET /api/simulation/overlay`

### Gemini-Powered Explainability
1. Ensure `GEMINI_API_KEY` is present in the backend `.env` (see [Environment variables](#backend-setup)).
2. The Modeling Workspace calls `GET /api/modeling/explain` for global summaries and `POST /api/modeling/predict/explain` for transaction-level narratives.
3. Responses always include fallback text so the UI never breaks if the external API is unavailable.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend Setup

```bash
# Clone repository
git clone https://github.com/RaviTeja799/Infosys-springboard-project.git
cd Infosys-springboard-project

# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run API server
uvicorn src.api.main:app --reload
```

#### Environment variables
Create a `.env` file inside `backend/` (or export the values in your shell) before starting uvicorn:

```env
USE_MOCK_DATA=true                  # serves cached Indian mock data when MongoDB is empty
GEMINI_API_KEY=your-google-key      # enables AI explanations in Modeling Workspace
GEMINI_MODEL=gemini-1.5-flash       # optional override; defaults to gemini-1.5-flash
```

> Tip: leave `USE_MOCK_DATA=true` for demos so the React dashboard always receives consistent Indian locations/channels. Toggle it off when connecting to a real MongoDB instance.

**Backend will run on:** `http://localhost:8000`  
**API Documentation:** `http://localhost:8000/docs`

### Frontend Setup

```bash
# Navigate to frontend (from project root)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Frontend will run on:** `http://localhost:5173`

---

## 🔌 API Endpoints

### Authentication
```http
POST /api/auth/register    # Register new user
POST /api/auth/login       # Login user
GET  /api/auth/me          # Get current user
```

### Fraud Detection
```http
POST /api/predict          # Predict single transaction
POST /api/batch-predict    # Predict multiple transactions
GET  /api/transactions     # Get transaction history
GET  /api/metrics          # Get model performance metrics
```

### Example: Predict Fraud

**Request:**
```bash
curl -X POST "http://localhost:8000/api/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "T1001",
    "customer_id": "C123",
    "amount": 5000,
    "channel": "online",
    "timestamp": "2024-01-15T10:30:00",
    "account_age_days": 365,
    "kyc_verified": true
  }'
```

**Response:**
```json
{
  "transaction_id": "T1001",
  "prediction": "Fraud",
  "risk_score": 0.85,
  "risk_level": "High",
  "confidence": 0.95,
  "alerts": [
    "High transaction amount: $5000",
    "Suspicious hour: 22:00"
  ]
}
```

---

## 📊 Project Modules

| Module | Timeline | Status | Description |
|--------|----------|--------|-------------|
| **Module 1** | Weeks 1-2 | ✅ Complete | Data Collection & Preprocessing |
| **Module 2** | Weeks 3-4 | ✅ Complete | Predictive Transaction Modeling |
| **Module 3** | Weeks 5-6 | ❌ Incomplete | Real-Time Fraud Detection Engine |
| **Module 4** | Weeks 7-8 | ❌ Incomplete | Deployment & Integration |

### Module Details

#### 📥 Module 1: Data Preprocessing
- Data loading and validation
- Missing value handling
- Feature engineering (temporal, amount-based)
- Data splitting (70/15/15)

#### 🤖 Module 2: ML Modeling
- Model training (XGBoost, Random Forest)
- Hyperparameter tuning
- Performance evaluation (Accuracy, Precision, Recall, F1, AUC)
- Model persistence

#### 🔍 Module 3: Fraud Detection
- Risk detection logic
- Fraud signature matching
- Behavioral deviation analysis
- Real-time alerting

#### 🚀 Module 4: Deployment
- FastAPI REST API
- React dashboard
- API documentation
- System integration

---

## 🛠️ Technology Stack

### Backend
| Category | Technology |
|----------|-----------|
| **Language** | Python 3.11+ |
| **Framework** | FastAPI |
| **ML/AI** | Scikit-learn, XGBoost, Pandas, NumPy |
| **Visualization** | Matplotlib, Seaborn |
| **Database** | MongoDB |
| **Authentication** | JWT (JSON Web Tokens) |
| **Testing** | Pytest |
| **API Docs** | Swagger/OpenAPI |

### Frontend
| Category | Technology |
|----------|-----------|
| **Framework** | React 18+ with TypeScript |
| **Build Tool** | Vite |
| **Styling** | TailwindCSS |
| **UI Components** | Shadcn/ui |
| **State Management** | Zustand / Redux |
| **Data Fetching** | React Query, Axios |
| **Charts** | Recharts, Chart.js |
| **Routing** | React Router v6 |

---

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/test_preprocessing.py
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Backend README](backend/README.md) | Backend setup and API details |
| [Frontend README](frontend/README.md) | Frontend setup and components |
| [Project Structure](backend/docs/PROJECT_STRUCTURE.md) | Detailed project organization |
| [Quick Start Guide](QUICK_START.md) | Get started in 5 minutes |
| [API Documentation](http://localhost:8000/docs) | Interactive API docs (when running) |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript/TypeScript
- Write tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 TransIntelliFlow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

This project is part of the **Infosys Virtual Internship - BFSI Track**.

---

## 👥 Team

| Role | Responsibilities |
|------|-----------------|
| **Backend Team** | Data preprocessing, ML modeling, API development |
| **Frontend Team** | React dashboard, UI/UX, API integration |
| **ML Team** | Model training, evaluation, optimization |

---

## 🙏 Acknowledgments

- **Infosys Springboard** - For the virtual internship opportunity
- **BFSI Sector** - For real-world problem inspiration
- **Open Source Community** - For amazing tools and libraries

---

"""
Fresh MongoDB Import Script
============================

This script:
1. Clears existing transactions collection
2. Imports fresh data with proper channel names
3. Creates modeltraining collection with ML features
4. Sets up proper indexes

Prerequisites:
    - Run prepare_data_and_train.py first to create transactions_mongodb_ready.csv
    - MongoDB connection configured in .env

Run from backend directory:
    python scripts/import_mongodb_fresh.py
"""

import os
import sys
import pandas as pd
import numpy as np
from pymongo import MongoClient, ASCENDING, DESCENDING
from datetime import datetime
from pathlib import Path
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Setup paths
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
DATA_DIR = BACKEND_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"

# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "fraud_detection_db")

# Data files
MONGODB_READY_FILE = PROCESSED_DIR / "transactions_mongodb_ready.csv"
ORIGINAL_DATA_FILE = PROCESSED_DIR / "fraud_detection_dataset_LLM (2) (2).csv"

print("=" * 60)
print("MONGODB FRESH DATA IMPORT")
print("=" * 60)

def connect_mongodb():
    """Connect to MongoDB"""
    logger.info(f"🔌 Connecting to MongoDB...")
    logger.info(f"   URL: {MONGODB_URL[:50]}...")
    
    try:
        client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=10000)
        client.admin.command('ping')
        logger.info("✅ Successfully connected to MongoDB")
        return client
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        return None

def create_indexes(db):
    """Create database indexes for better query performance"""
    logger.info("\n📑 Creating indexes...")
    
    # Transactions collection indexes
    db.transactions.create_index([("transaction_id", ASCENDING)], unique=True)
    db.transactions.create_index([("customer_id", ASCENDING)])
    db.transactions.create_index([("timestamp", DESCENDING)])
    db.transactions.create_index([("is_fraud", ASCENDING)])
    db.transactions.create_index([("channel", ASCENDING)])
    db.transactions.create_index([("kyc_verified", ASCENDING)])
    db.transactions.create_index([("risk_level", ASCENDING)])
    db.transactions.create_index([("created_at", DESCENDING)])
    
    # Compound indexes
    db.transactions.create_index([("is_fraud", ASCENDING), ("channel", ASCENDING)])
    db.transactions.create_index([("customer_id", ASCENDING), ("timestamp", DESCENDING)])
    
    # Model training collection indexes
    db.modeltraining.create_index([("transaction_id", ASCENDING)], unique=True)
    db.modeltraining.create_index([("is_fraud", ASCENDING)])
    
    # Predictions collection indexes
    db.predictions.create_index([("transaction_id", ASCENDING)], unique=True)
    db.predictions.create_index([("predicted_at", DESCENDING)])
    db.predictions.create_index([("risk_level", ASCENDING)])
    
    logger.info("✅ Indexes created successfully")

def load_data():
    """Load the MongoDB-ready data file or generate from original"""
    
    # Try to load the preprocessed file first
    if MONGODB_READY_FILE.exists():
        logger.info(f"📂 Loading preprocessed data: {MONGODB_READY_FILE}")
        df = pd.read_csv(MONGODB_READY_FILE)
        return df
    
    # If not available, generate from original
    if not ORIGINAL_DATA_FILE.exists():
        logger.error(f"❌ No data file found!")
        logger.error(f"   Expected: {MONGODB_READY_FILE}")
        logger.error(f"   Or: {ORIGINAL_DATA_FILE}")
        logger.error(f"   Run prepare_data_and_train.py first!")
        return None
    
    logger.info(f"📂 Loading original data: {ORIGINAL_DATA_FILE}")
    df = pd.read_csv(ORIGINAL_DATA_FILE)
    
    # Apply feature engineering inline
    logger.info("⚙️  Applying feature engineering...")
    
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['weekday'] = df['timestamp'].dt.weekday
    df['month'] = df['timestamp'].dt.month
    df['is_high_value'] = (df['transaction_amount'] > 50000).astype(int)
    df['transaction_amount_log'] = np.log1p(df['transaction_amount'])
    
    # Normalize channel
    df['channel'] = df['channel'].str.strip().str.capitalize()
    df['channel'] = df['channel'].replace({'Pos': 'POS', 'Atm': 'ATM'})
    
    # Normalize KYC
    df['kyc_verified'] = df['kyc_verified'].str.strip().str.capitalize()
    
    # One-hot encode for ML features
    df['channel_Atm'] = (df['channel'] == 'ATM').astype(int)
    df['channel_Mobile'] = (df['channel'] == 'Mobile').astype(int)
    df['channel_Pos'] = (df['channel'] == 'POS').astype(int)
    df['channel_Web'] = (df['channel'] == 'Web').astype(int)
    df['kyc_verified_No'] = (df['kyc_verified'].str.lower() == 'no').astype(int)
    df['kyc_verified_Yes'] = (df['kyc_verified'].str.lower() == 'yes').astype(int)
    
    return df

def import_transactions(db, df, batch_size=500):
    """Import transactions to MongoDB"""
    logger.info("\n📊 Importing transactions...")
    
    # Clear existing data
    logger.info("🗑️  Clearing existing transactions collection...")
    result = db.transactions.delete_many({})
    logger.info(f"   Deleted {result.deleted_count} existing records")
    
    transactions = []
    
    for idx, row in df.iterrows():
        try:
            # Parse timestamp
            if pd.isna(row['timestamp']):
                timestamp = datetime.now()
            elif isinstance(row['timestamp'], str):
                timestamp = pd.to_datetime(row['timestamp']).to_pydatetime()
            else:
                timestamp = row['timestamp'].to_pydatetime()
            
            transaction = {
                "transaction_id": str(row['transaction_id']),
                "customer_id": str(row['customer_id']),
                "timestamp": timestamp,
                "account_age_days": int(row['account_age_days']),
                "transaction_amount": float(row['transaction_amount']),
                "channel": str(row['channel']),  # Proper channel name!
                "kyc_verified": str(row['kyc_verified']),  # Proper KYC status!
                "is_fraud": int(row['is_fraud']),
                "hour": int(row.get('hour', timestamp.hour)),
                "weekday": int(row.get('weekday', timestamp.weekday())),
                "month": int(row.get('month', timestamp.month)),
                "is_high_value": int(row.get('is_high_value', 1 if row['transaction_amount'] > 50000 else 0)),
                "transaction_amount_log": float(row.get('transaction_amount_log', np.log1p(row['transaction_amount']))),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            transactions.append(transaction)
            
        except Exception as e:
            logger.warning(f"⚠️  Skipping row {idx}: {e}")
            continue
    
    if not transactions:
        logger.error("❌ No valid transactions to import!")
        return 0
    
    # Insert in batches
    total_inserted = 0
    for i in range(0, len(transactions), batch_size):
        batch = transactions[i:i + batch_size]
        try:
            result = db.transactions.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
            if (i // batch_size + 1) % 5 == 0:
                logger.info(f"   Progress: {total_inserted}/{len(transactions)} records...")
        except Exception as e:
            logger.warning(f"⚠️  Batch error: {e}")
    
    logger.info(f"✅ Imported {total_inserted} transactions")
    return total_inserted

def import_modeltraining(db, df, batch_size=500):
    """Import data to modeltraining collection with ML features"""
    logger.info("\n📊 Creating modeltraining collection...")
    
    # Clear existing data
    logger.info("🗑️  Clearing existing modeltraining collection...")
    result = db.modeltraining.delete_many({})
    logger.info(f"   Deleted {result.deleted_count} existing records")
    
    ML_FEATURES = [
        'account_age_days', 'transaction_amount', 'hour', 'weekday', 'month',
        'is_high_value', 'transaction_amount_log',
        'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
        'kyc_verified_No', 'kyc_verified_Yes'
    ]
    
    records = []
    
    for idx, row in df.iterrows():
        try:
            record = {
                "transaction_id": str(row['transaction_id']),
                "customer_id": str(row['customer_id']),
                "is_fraud": int(row['is_fraud']),
                "features": {feat: float(row.get(feat, 0)) for feat in ML_FEATURES},
                "created_at": datetime.utcnow()
            }
            records.append(record)
        except Exception as e:
            logger.warning(f"⚠️  Skipping row {idx}: {e}")
            continue
    
    if not records:
        logger.error("❌ No valid records for modeltraining!")
        return 0
    
    # Insert in batches
    total_inserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            result = db.modeltraining.insert_many(batch, ordered=False)
            total_inserted += len(result.inserted_ids)
        except Exception as e:
            logger.warning(f"⚠️  Batch error: {e}")
    
    logger.info(f"✅ Imported {total_inserted} records to modeltraining")
    return total_inserted

def print_statistics(db):
    """Print database statistics"""
    logger.info("\n📈 Database Statistics:")
    
    # Transactions stats
    total = db.transactions.count_documents({})
    fraud = db.transactions.count_documents({"is_fraud": 1})
    legit = db.transactions.count_documents({"is_fraud": 0})
    
    print(f"\n   Transactions Collection:")
    print(f"   ├── Total: {total}")
    print(f"   ├── Fraud: {fraud} ({fraud/total*100:.1f}%)" if total > 0 else "   ├── Fraud: 0")
    print(f"   └── Legitimate: {legit} ({legit/total*100:.1f}%)" if total > 0 else "   └── Legitimate: 0")
    
    # Channel distribution
    print(f"\n   Channel Distribution:")
    pipeline = [
        {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    for doc in db.transactions.aggregate(pipeline):
        channel = doc['_id']
        count = doc['count']
        print(f"   ├── {channel}: {count}")
    
    # KYC distribution
    print(f"\n   KYC Verified Distribution:")
    pipeline = [
        {"$group": {"_id": "$kyc_verified", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    for doc in db.transactions.aggregate(pipeline):
        kyc = doc['_id']
        count = doc['count']
        print(f"   ├── {kyc}: {count}")
    
    # Modeltraining stats
    mt_total = db.modeltraining.count_documents({})
    print(f"\n   Modeltraining Collection:")
    print(f"   └── Total: {mt_total}")
    
    # Sample record
    print(f"\n   Sample Transaction Record:")
    sample = db.transactions.find_one()
    if sample:
        for key in ['transaction_id', 'customer_id', 'channel', 'kyc_verified', 
                    'transaction_amount', 'is_fraud', 'hour']:
            print(f"   ├── {key}: {sample.get(key)}")

def main():
    """Main import function"""
    
    # Connect to MongoDB
    client = connect_mongodb()
    if not client:
        sys.exit(1)
    
    db = client[DATABASE_NAME]
    
    # Load data
    df = load_data()
    if df is None:
        sys.exit(1)
    
    logger.info(f"\n📊 Loaded {len(df)} records")
    logger.info(f"📋 Columns: {list(df.columns)}")
    
    # Check channel column
    if 'channel' in df.columns:
        logger.info(f"✅ Channel column found!")
        logger.info(f"   Values: {df['channel'].unique()}")
    else:
        logger.error("❌ Channel column missing!")
        sys.exit(1)
    
    # Import transactions
    import_transactions(db, df)
    
    # Import modeltraining
    import_modeltraining(db, df)
    
    # Create indexes
    create_indexes(db)
    
    # Print statistics
    print_statistics(db)
    
    # Close connection
    client.close()
    
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE!")
    print("=" * 60)
    print("""
✅ Data imported successfully with proper channel names!

Next Steps:
1. Restart the backend server
2. Test predictions via API
3. Check frontend displays proper channel names
    """)

if __name__ == "__main__":
    main()

"""
Verify MongoDB data
"""
from pymongo import MongoClient
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv

load_dotenv()
client = MongoClient(os.getenv('MONGODB_URL'))
db = client[os.getenv('DATABASE_NAME', 'fraud_detection_db')]

print('Sample transactions with different channels:')
for channel in ['Mobile', 'Web', 'POS', 'ATM']:
    doc = db.transactions.find_one({'channel': channel})
    if doc:
        print(f"  {channel}: TXN={doc['transaction_id']}, Amount={doc['transaction_amount']}, KYC={doc['kyc_verified']}")

print('\nChannel distribution:')
pipeline = [
    {"$group": {"_id": "$channel", "count": {"$sum": 1}}},
    {"$sort": {"count": -1}}
]
for doc in db.transactions.aggregate(pipeline):
    print(f"  {doc['_id']}: {doc['count']}")

print('\nModeltraining collection sample:')
doc = db.modeltraining.find_one()
if doc:
    print(f"  TXN: {doc['transaction_id']}")
    print(f"  Features: {list(doc['features'].keys())}")

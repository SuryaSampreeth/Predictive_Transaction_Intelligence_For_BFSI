"""
Analyze fraud patterns in the dataset
"""
import pandas as pd
import numpy as np

# Load the original data
df = pd.read_csv('data/processed/fraud_detection_dataset_LLM (2) (2).csv')

# Analyze fraud vs legitimate
fraud = df[df['is_fraud'] == 1]
legit = df[df['is_fraud'] == 0]

print('=== Fraud Patterns Analysis ===')
print(f'\nTotal: {len(df)}, Fraud: {len(fraud)}, Legit: {len(legit)}')

print(f'\nAverage Transaction Amount:')
print(f'  Fraud: ${fraud["transaction_amount"].mean():,.0f}')
print(f'  Legit: ${legit["transaction_amount"].mean():,.0f}')

print(f'\nTransaction Amount Range:')
print(f'  Fraud: ${fraud["transaction_amount"].min():,.0f} - ${fraud["transaction_amount"].max():,.0f}')
print(f'  Legit: ${legit["transaction_amount"].min():,.0f} - ${legit["transaction_amount"].max():,.0f}')

print(f'\nAverage Account Age (days):')
print(f'  Fraud: {fraud["account_age_days"].mean():.0f}')
print(f'  Legit: {legit["account_age_days"].mean():.0f}')

print(f'\nKYC Verified - Fraud:')
print(fraud['kyc_verified'].value_counts())
print(f'\nKYC Verified - Legit:')
print(legit['kyc_verified'].value_counts())

print(f'\nChannel Distribution - Fraud:')
print(fraud['channel'].value_counts())
print(f'\nChannel Distribution - Legit:')
print(legit['channel'].value_counts())

# Now test model on actual fraud cases
print('\n=== Testing Model on Actual Fraud Cases ===')

import joblib
model = joblib.load('outputs/all_models/random_forest_model.pkl')

# Load ML features
df['timestamp'] = pd.to_datetime(df['timestamp'])
df['hour'] = df['timestamp'].dt.hour
df['weekday'] = df['timestamp'].dt.weekday
df['month'] = df['timestamp'].dt.month
df['is_high_value'] = (df['transaction_amount'] > 50000).astype(int)
df['transaction_amount_log'] = np.log1p(df['transaction_amount'])
df['channel_Atm'] = (df['channel'] == 'ATM').astype(int)
df['channel_Mobile'] = (df['channel'] == 'Mobile').astype(int)
df['channel_Pos'] = (df['channel'] == 'POS').astype(int)
df['channel_Web'] = (df['channel'] == 'Web').astype(int)
df['kyc_verified_No'] = (df['kyc_verified'] == 'No').astype(int)
df['kyc_verified_Yes'] = (df['kyc_verified'] == 'Yes').astype(int)

ML_FEATURES = [
    'account_age_days', 'transaction_amount', 'hour', 'weekday', 'month',
    'is_high_value', 'transaction_amount_log',
    'channel_Atm', 'channel_Mobile', 'channel_Pos', 'channel_Web',
    'kyc_verified_No', 'kyc_verified_Yes'
]

# Test on first 10 fraud cases
print('\nFirst 10 Fraud Cases:')
fraud_indices = df[df['is_fraud'] == 1].head(10).index
for idx in fraud_indices:
    row = df.loc[idx]
    X = df.loc[[idx], ML_FEATURES]
    proba = model.predict_proba(X)[0][1]
    
    if proba < 0.4:
        risk = 'Low'
    elif proba < 0.7:
        risk = 'Medium'
    else:
        risk = 'High'
    
    print(f'  TXN: {row["transaction_id"]}, Amount: ${row["transaction_amount"]:,.0f}, KYC: {row["kyc_verified"]}, Prob: {proba:.3f}, Risk: {risk}')

# Check overall distribution
print('\n=== Overall Probability Distribution ===')
X_all = df[ML_FEATURES]
y_all = df['is_fraud']
probas = model.predict_proba(X_all)[:, 1]

for low, high, label in [(0, 0.4, "Low"), (0.4, 0.7, "Medium"), (0.7, 1.0, "High")]:
    mask = (probas >= low) & (probas < high)
    fraud_in_bucket = y_all[mask].sum()
    total = mask.sum()
    if total > 0:
        print(f'{label}: {total} transactions, {fraud_in_bucket} frauds ({fraud_in_bucket/total*100:.1f}% fraud rate)')

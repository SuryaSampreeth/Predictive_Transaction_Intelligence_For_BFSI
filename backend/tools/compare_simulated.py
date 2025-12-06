import requests
from collections import Counter, defaultdict

API = "http://localhost:8000/api/transactions?skip=0&limit=10000"
try:
    resp = requests.get(API, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    txns = data.get('transactions', [])
except Exception as e:
    print('ERROR fetching transactions:', e)
    raise SystemExit(1)

print(f'Total transactions fetched: {len(txns)}')

by_source = defaultdict(list)
for t in txns:
    src = t.get('source') or ('import' if t.get('created_at') else 'unknown')
    by_source[src].append(t)

for src, items in by_source.items():
    total = len(items)
    fraud_count = sum(1 for x in items if x.get('is_fraud') == 1)
    avg_amount = sum(x.get('transaction_amount',0) for x in items) / total if total else 0
    avg_acc_age = sum(x.get('account_age_days',0) for x in items) / total if total else 0
    kyc = Counter(x.get('kyc_verified','Unknown') for x in items)
    channels = Counter(x.get('channel','Unknown') for x in items)
    probs = [x.get('fraud_probability') for x in items if x.get('fraud_probability') is not None]
    avg_prob = sum(probs)/len(probs) if probs else None
    print('\nSource:', src)
    print('  Total:', total)
    print('  Fraud count:', fraud_count)
    print('  Fraud rate:', f"{(fraud_count/total*100):.2f}%" if total else 'N/A')
    print('  Avg amount:', round(avg_amount,2))
    print('  Avg account_age_days:', round(avg_acc_age,2))
    print('  Avg fraud_probability:', round(avg_prob,4) if avg_prob is not None else 'N/A')
    print('  KYC distribution:', dict(kyc))
    print('  Channel distribution:', dict(channels))

# Quick compare simulated vs imported/dataset
sim = by_source.get('simulation', [])
imported = []
# treat sources other than 'simulation' as imported/real
for k,v in by_source.items():
    if k != 'simulation':
        imported.extend(v)

print('\nSUMMARY COMPARISON:')
print('  Simulated total:', len(sim))
print('  Imported/other total:', len(imported))
if sim:
    sim_fraud = sum(1 for x in sim if x.get('is_fraud')==1)
    print('  Simulated fraud count:', sim_fraud, f'({sim_fraud/len(sim)*100:.2f}%)')
if imported:
    imp_fraud = sum(1 for x in imported if x.get('is_fraud')==1)
    print('  Imported fraud count:', imp_fraud, f'({imp_fraud/len(imported)*100:.2f}%)')

# Top feature differences (amount, account_age_days)
import statistics
if sim and imported:
    sim_amounts = [x.get('transaction_amount',0) for x in sim]
    imp_amounts = [x.get('transaction_amount',0) for x in imported]
    print('\n  Median amount - Simulated:', statistics.median(sim_amounts), 'Imported:', statistics.median(imp_amounts))
    sim_age = [x.get('account_age_days',0) for x in sim]
    imp_age = [x.get('account_age_days',0) for x in imported]
    print('  Median account_age_days - Simulated:', statistics.median(sim_age), 'Imported:', statistics.median(imp_age))

print('\nDone')

# Simulation Lab & Case Management Workflow Update

## ✅ Completed Changes

### 1. Dashboard Status (Already Using Latest APIs)
- `DashboardNew.tsx` uses latest endpoints:
  - `fetchTransactions` with 10,000 limit
  - `fetchFraudStatistics`
  - `fetchChannelStatistics`
  - `fetchModelMetrics`
- Auto-refresh every 30s
- Filters by timestamp (business date) for date ranges

### 2. Transaction Store Context Created
**File:** `frontend/src/context/TransactionStoreContext.tsx`
- React Context to manage pending and verified transactions
- Separates simulation/model testing transactions from stored data
- Tracks feedback (correct/incorrect, actual label, notes)
- Methods:
  - `addPendingTransaction()` - Add single transaction
  - `addPendingTransactionsBatch()` - Add multiple transactions
  - `markTransactionVerified()` - Move to verified with feedback
  - `clearVerifiedTransactions()` - Remove after MongoDB storage
  - `getPendingCount()`, `getVerifiedCount()` - Counters

### 3. App.tsx Updated
- Wrapped app with `<TransactionStoreProvider>`
- All child components can now access transaction store

### 4. New SimulationLab Created
**File:** `frontend/src/pages/SimulationLabNew.tsx`
- ✅ Removed MongoDB storage button
- ✅ Added "Send to Case Management" button
- ✅ Generates transactions with realistic fraud patterns (9-15% fraud rate)
- ✅ Sends completed predictions to Transaction Store
- ✅ Navigates to Case Management after send
- ✅ Shows pending count in button label
- ✅ Info card explains new workflow

## 🚧 Remaining Tasks

### 5. Update Case Management Page
**File:** `frontend/src/pages/CaseManagement.tsx`

**Changes Needed:**
1. **Import Transaction Store**
   ```tsx
   import { useTransactionStore, PendingTransaction } from '@/context/TransactionStoreContext';
   import { storeSimulationTransactionsBatch, SimulationTransaction } from '@/services/api';
   ```

2. **Add Two New Tabs:**
   - **"Pending Verification" Tab** - Shows unverified transactions from simulation/model testing
   - **"Verified Transactions" Tab** - Shows verified transactions ready for MongoDB

3. **Feedback Loop UI (Per Transaction):**
   ```tsx
   <div className="border rounded-lg p-4">
     <h4 className="font-semibold mb-2">Was this prediction correct?</h4>
     <div className="flex gap-2">
       <Button onClick={() => handleMarkCorrect(transaction.id)}>
         Mark as Correct
       </Button>
       <Button variant="outline" onClick={() => handleMarkIncorrect(transaction.id)}>
         Mark as Incorrect
       </Button>
     </div>
   </div>
   ```

4. **Implement Handlers:**
   ```tsx
   const { pendingTransactions, verifiedTransactions, markTransactionVerified, clearVerifiedTransactions } = useTransactionStore();

   const handleMarkCorrect = (id: string) => {
     const txn = pendingTransactions.find(t => t.id === id);
     if (!txn) return;
     
     const actualLabel = txn.prediction.prediction; // Keep model prediction
     markTransactionVerified(id, true, actualLabel, 'Verified as correct');
     toast.success('Transaction verified');
   };

   const handleMarkIncorrect = (id: string) => {
     const txn = pendingTransactions.find(t => t.id === id);
     if (!txn) return;
     
     // Flip the label
     const actualLabel = txn.prediction.prediction === 'Fraud' ? 'Legitimate' : 'Fraud';
     markTransactionVerified(id, false, actualLabel, 'Corrected by user');
     toast.success('Transaction corrected and verified');
   };
   ```

5. **Batch Save to MongoDB Button:**
   ```tsx
   const saveVerifiedToMongoDB = async () => {
     if (verifiedTransactions.length === 0) {
       toast.error("No verified transactions to save");
       return;
     }
     
     const transactions: SimulationTransaction[] = verifiedTransactions.map((t) => ({
       transaction_id: t.id,
       customer_id: t.payload.customer_id,
       transaction_amount: t.payload.amount,
       channel: t.payload.channel,
       timestamp: t.payload.timestamp || new Date().toISOString(),
       is_fraud: t.feedback!.actualLabel === 'Fraud' ? 1 : 0,
       fraud_probability: t.prediction.risk_score ?? t.prediction.fraud_probability ?? 0,
       risk_level: t.prediction.risk_level || "Low",
       source: t.source,
       account_age_days: t.payload.account_age_days,
       kyc_verified: t.payload.kyc_verified,
       hour: t.payload.hour,
     }));
     
     try {
       const result = await storeSimulationTransactionsBatch(transactions);
       toast.success(`Saved ${result.stored_count} verified transactions to MongoDB`);
       clearVerifiedTransactions(verifiedTransactions.map(t => t.id));
     } catch (error: any) {
       toast.error(`Failed to save: ${error.message}`);
     }
   };
   ```

6. **UI Layout Structure:**
   ```tsx
   <Tabs defaultValue="cases">
     <TabsList>
       <TabsTrigger value="cases">Cases</TabsTrigger>
       <TabsTrigger value="pending">
         Pending Verification ({getPendingCount()})
       </TabsTrigger>
       <TabsTrigger value="verified">
         Verified ({getVerifiedCount()})
       </TabsTrigger>
     </TabsList>

     <TabsContent value="cases">
       {/* Existing case management UI */}
     </TabsContent>

     <TabsContent value="pending">
       <Card>
         <CardHeader>
           <CardTitle>Pending Verification</CardTitle>
         </CardHeader>
         <CardContent>
           {pendingTransactions.map((txn) => (
             <div key={txn.id} className="border-b pb-4 mb-4">
               <div className="flex justify-between items-start">
                 <div>
                   <p className="font-mono">{txn.id}</p>
                   <p className="text-sm">Amount: ₹{txn.payload.amount.toLocaleString()}</p>
                   <p className="text-sm">Channel: {txn.payload.channel}</p>
                   <Badge variant={txn.prediction.prediction === 'Fraud' ? 'destructive' : 'default'}>
                     {txn.prediction.prediction}
                   </Badge>
                 </div>
                 <div className="text-right space-y-2">
                   <p className="text-sm font-semibold">Was this prediction correct?</p>
                   <div className="flex gap-2">
                     <Button size="sm" onClick={() => handleMarkCorrect(txn.id)}>
                       Mark as Correct
                     </Button>
                     <Button size="sm" variant="outline" onClick={() => handleMarkIncorrect(txn.id)}>
                       Mark as Incorrect
                     </Button>
                   </div>
                 </div>
               </div>
             </div>
           ))}
         </CardContent>
       </Card>
     </TabsContent>

     <TabsContent value="verified">
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle>Verified Transactions</CardTitle>
             <Button onClick={saveVerifiedToMongoDB} disabled={verifiedTransactions.length === 0}>
               <Database className="mr-2 h-4 w-4" />
               Save {verifiedTransactions.length} to MongoDB
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {/* List verified transactions with feedback info */}
         </CardContent>
       </Card>
     </TabsContent>
   </Tabs>
   ```

### 6. Update Route in App.tsx
Replace SimulationLab route:
```tsx
<Route path="/simulation-lab" element={<ProtectedPage><SimulationLabNew /></ProtectedPage>} />
```

## Workflow Summary

**Current Flow:**
1. User runs Simulation Lab → generates 100 transactions
2. Model predicts fraud/legitimate for each
3. User clicks "Send to Case Management"
4. Transactions appear in Case Management → Pending Verification tab
5. User reviews each transaction, marks as Correct or Incorrect
6. Verified transactions move to Verified tab
7. User clicks "Save to MongoDB" → batch inserts to database
8. Verified transactions cleared from memory

**Benefits:**
- Human-in-the-loop feedback for model improvement
- Prevents bad synthetic data from polluting training set
- Allows correction of model mistakes before storage
- Clear separation of unverified vs verified data

## Next Steps

1. Complete Case Management updates (listed above in Task 5)
2. Update App.tsx route to use SimulationLabNew
3. Test end-to-end flow:
   - Run simulation → Send to Case Management
   - Verify transactions with feedback
   - Save verified batch to MongoDB
4. Verify MongoDB contains correct verified labels
5. Optional: Add analytics on feedback accuracy (how many corrections vs confirms)

## Files Created/Modified

**Created:**
- `frontend/src/context/TransactionStoreContext.tsx` ✅
- `frontend/src/pages/SimulationLabNew.tsx` ✅

**Modified:**
- `frontend/src/App.tsx` ✅ (added TransactionStoreProvider)

**To Modify:**
- `frontend/src/pages/CaseManagement.tsx` (pending - add verification tabs)
- `frontend/src/App.tsx` (update route to use SimulationLabNew)

import numpy as np
import pandas as pd
import joblib

class FraudPreprocessor:
    def __init__(self):
        # fixed feature order for the model
        self.final_features = [
            'account_age_days',
            'transaction_amount',
            'hour',
            'weekday',
            'month',
            'is_high_value',
            'transaction_amount_log',
            'channel_Atm',
            'channel_Mobile',
            'channel_Pos',
            'channel_Web',
            'kyc_verified_No',
            'kyc_verified_Yes'
        ]

        # Channel mapping: normalized name -> feature suffix
        self.channel_mapping = {
            "atm": "Atm",
            "mobile": "Mobile",
            "pos": "Pos",
            "web": "Web"
        }
        self.kyc_values = ["No", "Yes"]

    def transform(self, input_dict):
        """
        Accept raw JSON input and return a dataframe with 13 final features.
        """
        df = pd.DataFrame([input_dict])

        # --- NUMERIC FEATURES DIRECTLY ---
        df["account_age_days"] = df["account_age_days"].astype(float)
        df["transaction_amount"] = df["transaction_amount"].astype(float)

        # --- DATETIME DERIVED FIELDS ---
        # assume timestamp provided as ISO string e.g. "2023-02-15 14:23:00"
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["hour"] = df["timestamp"].dt.hour
        df["weekday"] = df["timestamp"].dt.weekday
        df["month"] = df["timestamp"].dt.month

        # --- VALUE FEATURES ---
        # High value threshold is 50000 to match training data
        df["is_high_value"] = (df["transaction_amount"] > 50000).astype(int)

        df["transaction_amount_log"] = np.log1p(df["transaction_amount"])

        # --- ONE HOT ENCODING: channel (case-insensitive) ---
        channel_lower = str(df["channel"].iloc[0]).lower().strip()
        for key, suffix in self.channel_mapping.items():
            df[f"channel_{suffix}"] = int(channel_lower == key)

        # --- ONE HOT ENCODING: KYC (case-insensitive) ---
        kyc_lower = str(df["kyc_verified"].iloc[0]).lower().strip()
        for val in self.kyc_values:
            df[f"kyc_verified_{val}"] = int(kyc_lower == val.lower())

        # --- SELECT EXACT MODEL FEATURES IN CORRECT ORDER ---
        df_final = df[self.final_features]

        return df_final

    def save_preprocessor(self, filename="preprocessor.pkl"):
        joblib.dump(self, filename)


import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

# Simulated historical earthquake data
def generate_data(n=1000):
    np.random.seed(42)
    data = {
        'seismic_activity': np.random.uniform(0, 10, n),
        'depth_km': np.random.uniform(0, 700, n),
        'magnitude': np.random.uniform(1, 9, n),
        'tectonic_zone': np.random.choice([0, 1], size=n),  # 0 = stable, 1 = active
    }
    df = pd.DataFrame(data)
    # Define severity (1 = severe) based on rules
    df['severe'] = ((df['magnitude'] > 6.5) & (df['depth_km'] < 100) & (df['tectonic_zone'] == 1)).astype(int)
    return df

# Load data
df = generate_data()

# Check class balance
print("Class distribution:\n", df['severe'].value_counts())

# Train/test split
X = df[['seismic_activity', 'depth_km', 'magnitude', 'tectonic_zone']]
y = df['severe']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model with class_weight to handle imbalance
model = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
model.fit(X_train, y_train)

# Predict and evaluate
predictions = model.predict(X_test)
probs = model.predict_proba(X_test)[:, 1]
adjusted_preds = (probs > 0.3).astype(int)  # Lower threshold for more sensitivity

# Reports
print("\nClassification Report (Default Threshold):")
print(classification_report(y_test, predictions))
print("Confusion Matrix (Default Threshold):\n", confusion_matrix(y_test, predictions))

print("\nClassification Report (Adjusted Threshold 0.3):")
print(classification_report(y_test, adjusted_preds))
print("Confusion Matrix (Adjusted Threshold):\n", confusion_matrix(y_test, adjusted_preds))

# Feature importance
importances = model.feature_importances_
features = X.columns
plt.barh(features, importances)
plt.title("Feature Importances")
plt.xlabel("Importance")
plt.show()

# Updated alert function to accept a DataFrame row
def issue_alert(input_df):
    prob = model.predict_proba(input_df)[0][1]
    prediction = int(prob > 0.3)  # use adjusted threshold
    if prediction == 1:
        print(f"⚠ ALERT: Potential Severe Earthquake Detected! (probability={prob:.2f})")
    else:
        print(f"✅ Normal seismic activity. (probability={prob:.2f})")

# Example usage
sample_input = pd.DataFrame([[7.2, 50, 7.1, 1]], columns=X.columns)
issue_alert(sample_input)

# Plot for understanding
plt.scatter(df['magnitude'], df['depth_km'], c=df['severe'], cmap='coolwarm', alpha=0.6)
plt.xlabel("Magnitude")
plt.ylabel("Depth (km)")
plt.title("Earthquake Severity Visualization")
plt.show()

import os
import time
import csv
import numpy as np
import joblib

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


# GLOBALS

MODEL = None
SCALER = None
import os

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "risk_model.pkl")

IMPORTANT_EXTS = {'.docx', '.pdf', '.db', '.py', '.xlsx'}
EXECUTABLE_EXTS = {'.exe', '.bat', '.sh', '.ps1'}


# FEATURE EXTRACTION

def extract_features(path):
    """
    Extracts ML features from a file path
    """
    try:
        stats = os.stat(path)
    except Exception:
        # If file is inaccessible, mark as risky
        return [9999, 9999, 1, 1, 1, 20]

    now = time.time()

    days_since_modified = (now - stats.st_mtime) / 86400
    size_mb = stats.st_size / (1024 * 1024)

    ext = os.path.splitext(path)[1].lower()
    name = os.path.basename(path)

    important_ext = int(ext in IMPORTANT_EXTS)
    executable = int(ext in EXECUTABLE_EXTS)
    hidden = int(name.startswith('.') or name.startswith('$'))
    depth = path.count(os.sep)

    return [
        days_since_modified,
        size_mb,
        important_ext,
        executable,
        hidden,
        depth
    ]



# TRAIN MODEL

def train_model(csv_path):
    """
    CSV format:
    days_since_modified,size_mb,important,executable,hidden,depth,label
    """
    global MODEL, SCALER

    X, y = [], []

    with open(csv_path, newline='') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            X.append(list(map(float, row[:-1])))
            y.append(int(row[-1]))

    SCALER = StandardScaler()
    X_scaled = SCALER.fit_transform(X)

    MODEL = LogisticRegression(
        max_iter=500,
        class_weight="balanced"
    )
    MODEL.fit(X_scaled, y)

    joblib.dump((MODEL, SCALER), MODEL_PATH)
    print("[AI] Model trained and saved.")



# LOAD MODEL

def load_model():
    global MODEL, SCALER

    if os.path.exists(MODEL_PATH):
        MODEL, SCALER = joblib.load(MODEL_PATH)
        print("[AI] Risk model loaded.")
    else:
        print("[AI] No model found. AI disabled.")



# PREDICTION

def is_risky(path):
    """
    Returns:
    (bool, label_string)
    """
    if MODEL is None or SCALER is None:
        return False, "AI not loaded"

    features = np.array(extract_features(path)).reshape(1, -1)
    features = SCALER.transform(features)

    prob = MODEL.predict_proba(features)[0][1]

    if prob >= 0.75:
        return True, f"High Risk ({prob:.2f})"
    elif prob >= 0.45:
        return False, f"Medium Risk ({prob:.2f})"
    else:
        return False, "Safe"


# OPTIONAL TEST

if __name__ == "__main__":
    load_model()
    test_path = __file__
    risky, label = is_risky(test_path)
    print(test_path, "→", label)

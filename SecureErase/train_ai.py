from SecureErase.ai_guard import train_model
import os

train_model(os.path.join(os.path.dirname(__file__), "ai_data.csv"))

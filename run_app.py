import sys
import os
import traceback

# Add the project root to sys.path so 'SecureErase' is importable as a package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from SecureErase import app
    from SecureErase import ai_guard

    # Train / refresh AI model on startup
    ai_guard.train_model(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'SecureErase', 'ai_data.csv')
    )

    app._init_audit_key()
    api = app.API()
    window = app.webview.create_window(
        'EraseXpertz — Quantum-Hardened Secure Wipe',
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'SecureErase', 'web', 'index.html'),
        js_api=api,
        width=960,
        height=740,
    )
    api.window = window
    app.webview.start(debug=True)
except Exception:
    traceback.print_exc()
    input("Press Enter to exit...")

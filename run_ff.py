import sys
import os
import traceback

# Add the project root to sys.path so 'ff.f1_modified' is importable as a package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from ff.f1_modified import app
    from ff.f1_modified import ai_guard

    if not app.is_admin():
        app.relaunch_self_as_admin()

    # Train / refresh AI model on startup
    ai_guard.train_model(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ff', 'f1_modified', 'ai_data.csv')
    )

    app._init_audit_key()
    api = app.API()
    
    import webview
    
    window = webview.create_window(
        'EraseXpertz — Quantum-Hardened Secure Wipe (FF)',
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ff', 'f1_modified', 'web', 'index.html'),
        js_api=api,
        width=960,
        height=740,
    )
    api.window = window
    webview.start(debug=True)
except Exception:
    traceback.print_exc()
    input("Press Enter to exit...")

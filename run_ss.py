import sys
import os
import traceback

# Add the project root to sys.path so 'ss.SecureErase_fixed' is importable as a package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from ss.SecureErase_fixed import app
    from ss.SecureErase_fixed import ai_guard

    if not app.is_admin():
        app.relaunch_self_as_admin()

    # Train / refresh AI model on startup
    ai_guard.train_model(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ss', 'SecureErase_fixed', 'ai_data.csv')
    )

    app._init_audit_key()
    api = app.API()
    
    import webview
    
    window = webview.create_window(
        'EraseXpertz — Quantum-Hardened Secure Wipe (SS)',
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ss', 'SecureErase_fixed', 'web', 'index.html'),
        js_api=api,
        width=960,
        height=740,
    )
    api.window = window
    webview.start(debug=True)
except Exception:
    traceback.print_exc()
    input("Press Enter to exit...")

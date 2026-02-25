import sys
import os
import traceback

# Add the parent directory to sys.path to allow importing SecureErase.app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from SecureErase import app
    app._init_audit_key()
    api = app.API()
    window = app.webview.create_window(
        'EraseXpertz — Quantum-Hardened Secure Wipe',
        'SecureErase/web/index.html',
        js_api=api,
        width=960,
        height=740,
    )
    app.webview.start()
except Exception:
    traceback.print_exc()

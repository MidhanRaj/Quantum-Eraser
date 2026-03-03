import webview
try:
    print("Creating window...")
    window = webview.create_window('Test Window', 'https://www.google.com')
    print("Starting webview...")
    webview.start()
    print("Webview started and closed.")
except Exception as e:
    print(f"Error: {e}")

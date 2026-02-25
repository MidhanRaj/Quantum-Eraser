import webview
try:
    window = webview.create_window('Test Window', 'https://www.google.com')
    webview.start()
    print("Webview started and finished successfully.")
except Exception as e:
    print(f"Error: {e}")

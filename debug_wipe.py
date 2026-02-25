import os
import sys
sys.path.insert(0, os.path.abspath("SecureErase"))
import SecureErase.app as app

fname = "debug_wipe.txt"
with open(fname, "w") as f:
    f.write("Debug Data")

print(f"Before wipe: {fname} exists={os.path.exists(fname)}")
result = app.secure_delete_file(fname, algorithm="zero", verify=True)
results = {
    "before_exists": os.path.exists(fname),
    "result": result,
    "after_exists": os.path.exists(fname),
    "dir_items": os.listdir(".")
}
import json
with open("debug_result.json", "w") as f:
    json.dump(results, f, indent=4)

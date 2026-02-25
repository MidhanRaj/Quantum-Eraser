import os
import sys
import time

# ─── Path Setup ───────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.abspath("SecureErase"))
try:
    import SecureErase.app as app
except ImportError:
    import app

PASS = "[PASS]"
FAIL = "[FAIL]"


def report(label, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"{status} {label}" + (f": {detail}" if detail else ""))
    return condition


# ═══════════════════════════════════════════════════════════════════════════════
#  Original Tests (1–3)
# ═══════════════════════════════════════════════════════════════════════════════

def test_zero_fill():
    fname = "test_zero_fill.txt"
    with open(fname, "w") as f:
        f.write("Secret Data " * 100)
    result = app.secure_delete_file(fname, algorithm="zero", verify=True)
    ok = not os.path.exists(fname) and result["status"] == "Success"
    report("Zero Fill: original filename gone", ok, f"verified={result.get('verified')}")

def test_dod_fill():
    fname = "test_dod_fill.txt"
    with open(fname, "w") as f:
        f.write("Top Secret " * 100)
    result = app.secure_delete_file(fname, algorithm="dod", verify=True)
    ok = not os.path.exists(fname) and result["status"] == "Success"
    report("DoD Fill: original filename gone", ok, f"verified={result.get('verified')}")

def test_log_file():
    ok = os.path.exists("wipe_log.log")
    report("Plaintext wipe_log.log created", ok)


# ═══════════════════════════════════════════════════════════════════════════════
#  New Tests (4–7)
# ═══════════════════════════════════════════════════════════════════════════════

def test_qrng_fallback():
    """
    Test 4: QRNG fallback — unset IBM_QUANTUM_TOKEN, wipe must still succeed
    using os.urandom() as the entropy source.
    """
    original_token = os.environ.pop("IBM_QUANTUM_TOKEN", None)
    try:
        fname = "test_qrng_fallback.txt"
        with open(fname, "w") as f:
            f.write("Fallback Test " * 50)
        result = app.secure_delete_file(fname, algorithm="random", verify=True)
        ok = not os.path.exists(fname) and result["status"] == "Success"
        report("QRNG Fallback (os.urandom): original filename gone", ok,
               f"QRNG_SOURCE={app.QRNG_SOURCE}")
    finally:
        if original_token is not None:
            os.environ["IBM_QUANTUM_TOKEN"] = original_token

def test_rename_before_delete():
    """
    Test 5: The original filename must not exist after a wipe (ensures
    rename-before-delete removed it, not just left it).
    """
    fname = "test_rename_check_ORIGINAL.txt"
    with open(fname, "w") as f:
        f.write("Sensitive rename test " * 50)
    original_abs = os.path.abspath(fname)
    result = app.secure_delete_file(fname, algorithm="random")
    ok = not os.path.exists(original_abs) and result["status"] == "Success"
    report("Rename-Before-Delete: original filename gone", ok)

def test_encrypted_audit_log():
    """
    Test 6: wipe_log.enc must exist and be non-empty after a wipe.
    This verifies log_wipe_event() is actually writing encrypted entries.
    """
    # Ensure audit key is initialised
    app._init_audit_key()
    log_path = app._AUDIT_LOG_PATH

    # Record size before
    size_before = os.path.getsize(log_path) if os.path.isfile(log_path) else 0

    fname = "test_audit_log_check.txt"
    with open(fname, "w") as f:
        f.write("Audit log test " * 20)
    app.secure_delete_file(fname, algorithm="zero")

    exists = os.path.isfile(log_path)
    size_after = os.path.getsize(log_path) if exists else 0
    grew = size_after > size_before

    report("PQC Audit Log (wipe_log.enc) created and grew",
           exists and grew,
           f"cipher={app._PQC_MODE}, size={size_after}B")

def test_sensitive_scanner():
    """
    Test 7: scan_sensitive() must classify 'password_backup.xlsx' as 'high'
    and an ordinary .txt file as 'safe'.
    """
    # Create temp files
    high_risk = "password_backup.xlsx"
    safe_file = "readme.txt"
    for f in [high_risk, safe_file]:
        with open(f, "w") as fh:
            fh.write("test")

    try:
        results = app.scan_sensitive(".")
        result_map = {r["name"]: r for r in results}

        # High risk check
        hr = result_map.get(high_risk, {})
        ok_high = hr.get("risk") == "high"
        report(
            "Sensitive Scanner: password_backup.xlsx -> HIGH",
            ok_high,
            f"got risk='{hr.get('risk')}' reason='{hr.get('reason')}'"
        )

        # Safe check
        sr = result_map.get(safe_file, {})
        ok_safe = sr.get("risk") == "safe"
        report(
            "Sensitive Scanner: readme.txt -> SAFE",
            ok_safe,
            f"got risk='{sr.get('risk')}'"
        )
    finally:
        for f in [high_risk, safe_file]:
            if os.path.exists(f):
                os.remove(f)


# ===============================================================================
#  Runner
# ===============================================================================

def main():
    print("=" * 60)
    print("  EraseXpertz -- Quantum-Hardened Wipe Verification")
    print("=" * 60)

    print("\n-- Original Tests -----------------------------------------")
    test_zero_fill()
    test_dod_fill()
    test_log_file()

    print("\n-- New Feature Tests --------------------------------------")
    test_qrng_fallback()
    test_rename_before_delete()
    test_encrypted_audit_log()
    test_sensitive_scanner()

    print("\n" + "=" * 50)
    print("Verification complete. All [FAIL] lines need attention.")


if __name__ == "__main__":
    main()

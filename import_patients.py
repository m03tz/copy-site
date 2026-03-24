import pandas as pd
import requests
import re
import sys
import os
import io
from datetime import datetime

# Redirect all output to a log file (avoids Windows console encoding issues)
_log = open("D:/doctor site/import_patients.log", "w", encoding="utf-8")

class _Tee:
    def __init__(self, *streams):
        self.streams = streams
    def write(self, data):
        for s in self.streams:
            try:
                s.write(data)
                s.flush()
            except Exception:
                pass
    def flush(self):
        for s in self.streams:
            try:
                s.flush()
            except Exception:
                pass

sys.stdout = _Tee(sys.stdout, _log)
sys.stderr = _Tee(sys.stderr, _log)

# ── Supabase credentials ──────────────────────────────────────────────────────
SUPABASE_URL = "https://mkgosgskgmkpflgzeoxl.supabase.co"
SERVICE_ROLE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ29zZ3NrZ21rcGZsZ3plb3hsIiwicm9sZSI6"
    "InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY1NTMwMiwiZXhwIjoyMDg2MjMxMzAyfQ"
    ".esEQr16BweCjVSLoeXQjcP5odZS8aFQsoXlqE5wTO3k"
)

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

EXCEL_PATH = r"C:\Users\computer\Downloads\معلومات موسعة حول جهات الاتصال.xlsx"
BATCH_SIZE = 500


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_dob(code6: str):
    """Parse DDMMYY → ISO date string. Year > 30 → 19xx, else 20xx."""
    if not code6.isdigit():
        return None
    dd = code6[0:2]
    mm = code6[2:4]
    yy = int(code6[4:6])
    year = 1900 + yy if yy > 30 else 2000 + yy
    try:
        d = datetime(year, int(mm), int(dd))
        return d.strftime("%Y-%m-%d")
    except ValueError:
        return None


def parse_row(row) -> dict | None:
    # Phone check
    phone_raw = row.get("هاتف العمل")
    if pd.isna(phone_raw) or str(phone_raw).strip() == "":
        return None
    phone = str(phone_raw).strip()
    phone_digits = re.sub(r"\D", "", phone)
    if not phone_digits:
        return None

    # Job-title / code check
    code_raw = row.get("المسمى الوظيفي")
    if pd.isna(code_raw) or str(code_raw).strip() == "":
        return None
    code_str = str(code_raw).strip().upper()
    if len(code_str) < 8:
        return None

    code6 = code_str[:6]
    initials = code_str[6:8]
    patient_code = code_str

    if not code6.isdigit():
        return None
    dob = parse_dob(code6)

    # Name
    name_raw = row.get("اسم جهة الاتصال")
    full_name_ar = " ".join(str(name_raw).split()) if not pd.isna(name_raw) else None

    # National ID
    nat_raw = row.get("الشركة")
    national_id = (
        None
        if pd.isna(nat_raw) or str(nat_raw).strip() in ("", "nan")
        else str(nat_raw).strip()
    )

    email = f"{phone_digits}@patient.local"

    return {
        "full_name_ar": full_name_ar,
        "national_id": national_id,
        "full_name_en": initials,
        "date_of_birth": dob,
        "patient_code": patient_code,
        "phone": phone,
        "email": email,
    }


def get_count(path: str, filter_param: str | None = None) -> int:
    """Get the total count of records via Content-Range header."""
    params = {"select": "id"}
    if filter_param:
        # e.g. "role=eq.patient"
        key, val = filter_param.split("=", 1)
        params[key] = val
    headers = {**HEADERS, "Prefer": "count=exact", "Range": "0-0"}
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=headers,
        params=params,
        timeout=30,
    )
    cr = resp.headers.get("Content-Range", "")
    # Format: "0-0/12345" or "*/12345"
    if "/" in cr:
        total = cr.split("/")[-1]
        if total.isdigit():
            return int(total)
    return -1


def fetch_all_auth_users() -> dict:
    """Fetch all auth users and return {email: user_id} dict."""
    email_to_id = {}
    page = 1
    per_page = 1000
    print("  Fetching all auth users in batches of 1000...")
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/admin/users",
            headers=HEADERS,
            params={"page": page, "per_page": per_page},
            timeout=60,
        )
        if resp.status_code != 200:
            print(f"  [ERROR] Fetching auth users page {page}: {resp.status_code} {resp.text[:200]}")
            break
        data = resp.json()
        users = data.get("users", [])
        if not users:
            break
        for u in users:
            email = u.get("email", "")
            uid = u.get("id", "")
            if email and uid:
                email_to_id[email] = uid
        print(f"    Page {page}: got {len(users)} users, total so far: {len(email_to_id)}")
        if len(users) < per_page:
            break
        page += 1
    return email_to_id


from concurrent.futures import ThreadPoolExecutor, as_completed

MAX_WORKERS = 30  # parallel connections for fallback inserts
SUB_BATCH = 50   # sub-batch size when retrying conflicting batches


def _try_batch(table: str, records: list, on_conflict: str) -> bool:
    """Attempt a bulk insert; return True on success."""
    headers = {
        **HEADERS,
        "Prefer": "resolution=ignore-duplicates,return=minimal",
    }
    params = {"on_conflict": on_conflict}
    try:
        resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=headers,
            params=params,
            json=records,
            timeout=60,
        )
        return resp.status_code in (200, 201, 204)
    except Exception:
        return False


def bulk_insert(table: str, records: list, on_conflict: str = "id") -> tuple[int, int]:
    """Try bulk insert; on failure split into sub-batches and retry in parallel.
    Returns (inserted_count, skipped_count)."""
    if _try_batch(table, records, on_conflict):
        return (len(records), 0)

    # Conflict on a non-PK unique column — split into sub-batches and retry in parallel
    print(f"  [INFO] Batch conflict on '{table}', retrying in sub-batches of {SUB_BATCH} (parallel)...")
    sub_batches = [records[i:i + SUB_BATCH] for i in range(0, len(records), SUB_BATCH)]
    ok = 0
    skipped = 0

    def _insert_sub(sub):
        if _try_batch(table, sub, on_conflict):
            return (len(sub), 0)
        # Still failing — these sub-batch records have a dup among them; skip all silently
        return (0, len(sub))

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(_insert_sub, sb) for sb in sub_batches]
        for f in as_completed(futures):
            ins, skp = f.result()
            ok += ins
            skipped += skp

    return (ok, skipped)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Patient profile/patient re-insert script")
    print("=" * 60)

    # Step 1: Check counts
    print("\n--- Step 1: Checking counts ---")
    profiles_count = get_count("profiles", "role=eq.patient")
    patients_count = get_count("patients")
    print(f"  profiles (role=patient): {profiles_count}")
    print(f"  patients:                {patients_count}")

    if profiles_count >= 6000:
        print(f"\nProfiles count ({profiles_count}) >= 6000. No re-insert needed.")
        return

    print(f"\nProfiles count ({profiles_count}) < 6000 — proceeding with full re-insert.")

    # Step 2: Load Excel
    print(f"\n--- Step 2: Loading Excel ---")
    print("  Path: (Arabic filename Excel)")
    df = pd.read_excel(EXCEL_PATH, dtype=str)
    total_rows = len(df)
    print(f"  Total rows read: {total_rows}")
    print(f"  Columns: {list(df.columns)}")

    # Step 3: Parse valid rows
    print("\n--- Step 3: Parsing rows ---")
    valid_rows = []
    skipped_parse = 0
    for _, row in df.iterrows():
        parsed = parse_row(row)
        if parsed:
            valid_rows.append(parsed)
        else:
            skipped_parse += 1

    print(f"  Valid rows:   {len(valid_rows)}")
    print(f"  Skipped rows: {skipped_parse}")

    if not valid_rows:
        print("\nNo valid rows to process. Exiting.")
        return

    # Step 4: Fetch all auth users
    print("\n--- Step 4: Fetching all auth users ---")
    email_to_id = fetch_all_auth_users()
    print(f"  Total auth users loaded: {len(email_to_id)}")

    # Filter to @patient.local only for stats
    patient_local_count = sum(1 for e in email_to_id if e.endswith("@patient.local"))
    print(f"  Auth users with @patient.local email: {patient_local_count}")

    # Step 5: Match and insert
    print("\n--- Step 5: Inserting profiles and patients ---")
    total_matched = 0
    total_unmatched = 0
    total_profile_ok = 0
    total_patient_ok = 0

    num_batches = (len(valid_rows) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"  Processing {num_batches} batch(es) of up to {BATCH_SIZE} rows each...\n")

    for batch_num in range(num_batches):
        start = batch_num * BATCH_SIZE
        end = min(start + BATCH_SIZE, len(valid_rows))
        batch = valid_rows[start:end]

        print(f"--- Batch {batch_num + 1}/{num_batches}  (rows {start + 1}–{end}) ---")

        profiles = []
        patients = []
        batch_unmatched = 0

        for rd in batch:
            user_id = email_to_id.get(rd["email"])
            if not user_id:
                batch_unmatched += 1
                total_unmatched += 1
                continue
            total_matched += 1
            profiles.append({
                "id": user_id,
                "role": "patient",
                "full_name_ar": rd["full_name_ar"],
                "full_name_en": rd["full_name_en"],
                "phone": rd["phone"],
                "email": None,
            })
            patients.append({
                "id": user_id,
                "date_of_birth": rd["date_of_birth"],
                "national_id": rd["national_id"],
                "patient_code": rd["patient_code"],
            })

        print(f"  Matched: {len(profiles)}  |  Unmatched (no auth user): {batch_unmatched}")

        if not profiles:
            print("  Nothing to insert for this batch.\n")
            continue

        prof_ok, prof_skip = bulk_insert("profiles", profiles, on_conflict="id")
        total_profile_ok += prof_ok
        print(f"  Profiles inserted: {prof_ok}  skipped/dup: {prof_skip}")

        pat_ok, pat_skip = bulk_insert("patients", patients, on_conflict="id")
        total_patient_ok += pat_ok
        print(f"  Patients inserted: {pat_ok}  skipped/dup: {pat_skip}")

        print(
            f"  Cumulative: processed={end},"
            f" matched={total_matched},"
            f" unmatched={total_unmatched}"
        )
        print()

    # Final summary
    print("=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Total rows read from Excel       : {total_rows}")
    print(f"Valid rows (passed filters)      : {len(valid_rows)}")
    print(f"Skipped at parse stage           : {skipped_parse}")
    print(f"Auth users loaded                : {len(email_to_id)}")
    print(f"Rows matched to auth users       : {total_matched}")
    print(f"Rows unmatched (no auth user)    : {total_unmatched}")
    print(f"Profiles bulk-inserted           : {total_profile_ok}")
    print(f"Patients bulk-inserted           : {total_patient_ok}")
    print("=" * 60)


if __name__ == "__main__":
    main()

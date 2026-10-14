import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
_BACKEND_DIR = Path(__file__).resolve().parent
_ROOT_DIR = _BACKEND_DIR.parent

if (_BACKEND_DIR / ".env").exists():
    load_dotenv(_BACKEND_DIR / ".env")
elif (_ROOT_DIR / ".env").exists():
    load_dotenv(_ROOT_DIR / ".env")
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY length: {len(SUPABASE_KEY)}")
print(f"SUPABASE_KEY starts with: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "No key")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials")
else:
    try:
        from supabase import create_client, Client
        print("Creating supabase client...")
        client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"Client created: {client}")
        
        # Test connection
        result = client.table('questoes').select('id', count='exact').execute()
        print(f"Connection successful! Total questoes: {result.count}")
        
    except Exception as e:
        print(f"Error creating client or querying: {e}")
        import traceback
        traceback.print_exc()
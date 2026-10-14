from app.core.config import settings
from app.core.config import get_supabase_client

def debug_settings():
    print("=== Settings Debug ===")
    print(f"ENVIRONMENT: {settings.ENVIRONMENT}")
    print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
    print(f"SUPABASE_KEY: {settings.SUPABASE_KEY[:10]}..." if settings.SUPABASE_KEY else "SUPABASE_KEY: None or empty")
    print(f"has_supabase: {settings.has_supabase}")
    
    supabase = get_supabase_client()
    print(f"supabase client: {supabase}")
    
    if supabase:
        try:
            # Try a simple query
            result = supabase.table('questoes').select('id').limit(1).execute()
            print(f"Query successful: {len(result.data)} rows")
        except Exception as e:
            print(f"Query failed: {e}")
    else:
        print("Failed to get supabase client")

if __name__ == "__main__":
    debug_settings()
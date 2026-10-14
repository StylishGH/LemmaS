from app.core.config import get_supabase_client

def test_connection():
    supabase = get_supabase_client()
    if supabase is None:
        print("Failed to connect to Supabase")
        return
    
    try:
        # Count questoes
        result = supabase.table('questoes').select('id', count='exact').execute()
        print(f"Total questoes: {result.count}")
        
        # Get sample data
        result = supabase.table('questoes').select('id, materia, topico, dificuldade, banca, ano').limit(5).execute()
        print("\nSample questoes:")
        for row in result.data:
            print(row)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_connection()
import sqlite3
import os

def check_tentativas():
    db_path = "../data/mathai.db"
    
    if not os.path.exists(db_path):
        db_path = "/d/dev/mathai-web/data/mathai.db"
    
    if not os.path.exists(db_path):
        print("Database not found")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if tentativas table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tentativas'")
        table = cursor.fetchone()
        if table:
            print("Tentativas table exists!")
            # Get schema
            cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='tentativas'")
            schema = cursor.fetchone()
            if schema:
                print("Tentativas schema:")
                print(schema[0])
                print()
            
            # Get count
            cursor.execute("SELECT COUNT(*) as count FROM tentativas")
            count = cursor.fetchone()
            print(f"Total tentativas: {count['count']}")
            print()
            
            # Get sample
            cursor.execute("SELECT * FROM tentativas LIMIT 3")
            rows = cursor.fetchall()
            print("Sample tentativas:")
            for row in rows:
                print(dict(row))
                print()
        else:
            print("Tentativas table does not exist")
            
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tentativas()
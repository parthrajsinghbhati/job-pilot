import config
from supabase_utils import supabase

def check():
    print("Checking database schema updates...")
    
    # 1. Check if user_preferences exists
    try:
        res = supabase.table('user_preferences').select('*').limit(1).execute()
        print("✅ 'user_preferences' table exists.")
    except Exception as e:
        print("❌ 'user_preferences' table check failed:", str(e))

    # 2. Check if user_id exists on jobs
    try:
        res = supabase.table('jobs').select('user_id').limit(1).execute()
        print("✅ 'user_id' column exists on 'jobs' table.")
    except Exception as e:
        print("❌ 'user_id' column check failed on 'jobs':", str(e))
        
    # 3. Check if user_id exists on customized_resumes
    try:
        res = supabase.table('customized_resumes').select('user_id').limit(1).execute()
        print("✅ 'user_id' column exists on 'customized_resumes' table.")
    except Exception as e:
        print("❌ 'user_id' column check failed on 'customized_resumes':", str(e))

if __name__ == '__main__':
    check()

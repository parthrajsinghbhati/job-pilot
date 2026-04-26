import config
from supabase_utils import supabase

def clear_data():
    user_id = config.CLERK_USER_ID
    if not user_id:
        print("No CLERK_USER_ID found.")
        return
    
    print(f"Clearing all jobs and resumes for User ID: {user_id}")
    
    try:
        # Delete jobs
        supabase.table("jobs").delete().eq("user_id", user_id).execute()
        # Delete resumes
        supabase.table("customized_resumes").delete().eq("user_id", user_id).execute()
        print("✅ Database cleared! You are starting from scratch.")
    except Exception as e:
        print("Error during clear:", str(e))

if __name__ == '__main__':
    clear_data()

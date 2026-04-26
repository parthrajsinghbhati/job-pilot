import config
from supabase_utils import supabase

def update_user_ids():
    user_id = config.CLERK_USER_ID
    if not user_id:
        print("No CLERK_USER_ID found in config.")
        return
    
    print(f"Assigning all anonymous jobs to User ID: {user_id}")
    
    try:
        supabase.table("jobs").update({"user_id": user_id}).is_("user_id", "null").execute()
        supabase.table("base_resume").update({"user_id": user_id}).is_("user_id", "null").execute()
        supabase.table("customized_resumes").update({"user_id": user_id}).is_("user_id", "null").execute()
        print("✅ Retroactive update complete! Check your React Dashboard now.")
    except Exception as e:
        print("Error during update:", str(e))

if __name__ == '__main__':
    update_user_ids()

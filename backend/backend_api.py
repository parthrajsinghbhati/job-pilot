from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import sys
import traceback
import config
from supabase_utils import supabase

app = FastAPI()

# Allow frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchRequest(BaseModel):
    query: str
    location: str = "India"
    user_id: str

@app.get("/health")
async def health():
    return {"status": "ok", "python": sys.version}

@app.get("/jobs/{user_id}")
async def get_jobs(user_id: str):
    """Fetch jobs for a user - uses service role key so RLS is bypassed."""
    try:
        result = supabase.table("jobs").select("*").eq("user_id", user_id).order("scraped_at", desc=True).execute()
        print(f"📋 /jobs/{user_id}: returning {len(result.data)} jobs")
        return {"jobs": result.data}
    except Exception as e:
        print(f"❌ /jobs error: {e}")
        traceback.print_exc()
        return {"jobs": [], "error": str(e)}

@app.post("/scrape")
async def trigger_scrape(request: SearchRequest, background_tasks: BackgroundTasks):
    print(f"🟢 /scrape called: query='{request.query}', location='{request.location}', user='{request.user_id}'")
    
    # 1. Clear old jobs
    try:
        supabase.table("jobs").delete().eq("user_id", request.user_id).execute()
        print(f"🗑️ Deleted old jobs for {request.user_id}")
        
        # 2. Update preferences
        supabase.table("user_preferences").upsert({
            "user_id": request.user_id,
            "linkedin_search_queries": [request.query],
            "location": request.location
        }, on_conflict="user_id").execute()
        print(f"📝 Updated preferences")
    except Exception as e:
        print(f"❌ Error preparing database: {e}")
        traceback.print_exc()

    # 3. Pass user ID to scraper
    env = os.environ.copy()
    env["CLERK_USER_ID"] = request.user_id

    def run_automation():
        try:
            print("🤖 BACKGROUND: Scraper starting...")
            result = subprocess.run(
                ["python3", "scraper.py"], 
                env=env, 
                capture_output=True, 
                text=True,
                timeout=300
            )
            print(f"🏁 Scraper done. Code: {result.returncode}")
            if result.stdout:
                print(f"STDOUT:\n{result.stdout[-2000:]}")
            if result.stderr:
                print(f"STDERR:\n{result.stderr[-2000:]}")
        except Exception as e:
            print(f"💥 Scraper crashed: {e}")
            traceback.print_exc()

    background_tasks.add_task(run_automation)
    return {"message": "Searching...", "user_id": request.user_id, "query": request.query}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

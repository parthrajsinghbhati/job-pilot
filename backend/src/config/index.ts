import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root or higher up if needed
dotenv.config();

// =================================================================
// 1. CORE SYSTEM CONFIGURATION (Do Not Modify)
// =================================================================
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const SUPABASE_TABLE_NAME = 'jobs';
export const SUPABASE_CUSTOMIZED_RESUMES_TABLE_NAME = 'customized_resumes';
export const SUPABASE_STORAGE_BUCKET = 'personalized_resumes';
export const SUPABASE_RESUME_STORAGE_BUCKET = 'resumes';
export const SUPABASE_BASE_RESUME_TABLE_NAME = 'base_resume';
export const BASE_RESUME_PATH = 'resume.json';

// API keys
export const LLM_API_KEY = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || process.env.GEMINI_FIRST_API_KEY || process.env.GROQ_API_KEY || '';

// =================================================================
// 2. USER PREFERENCES (Editable)
// =================================================================

// --- LLM Settings ---
export const LLM_MODEL = 'llama-3.3-70b-versatile'; // Groq model

// --- Search Configuration ---
export const LINKEDIN_SEARCH_QUERIES = ["maths lecturer", "statistics lecturer", "maths teacher", "Maths assistant professor", "Maths professor"];
export const LINKEDIN_LOCATION = "India";
export const LINKEDIN_GEO_ID = ""; // Leave empty to use location string
export const LINKEDIN_JOB_TYPE = "F"; // F=Full-time, C=Contract, P=Part-time, T=Temporary, I=Internship
export const LINKEDIN_JOB_POSTING_DATE = "r86400"; // r86400=Past 24h, r604800=Past week
export const LINKEDIN_F_WT = 1; // 1=Onsite, 2=Remote, 3=Hybrid

export const CAREERS_FUTURE_SEARCH_QUERIES = ["IT Support", "Full Stack Web Developer", "Application Support", "Cybersecurity Analyst", "fresher developer"];
export const CAREERS_FUTURE_SEARCH_CATEGORIES = ["Information Technology"];
export const CAREERS_FUTURE_SEARCH_EMPLOYMENT_TYPES = ["Full Time"];

// --- Processing Limits ---
export const SCRAPING_SOURCES = ["linkedin"]; // "linkedin", "careers_future"
export const JOBS_TO_SCORE_PER_RUN = 5;
export const JOBS_TO_CUSTOMIZE_PER_RUN = 1;
export const MAX_JOBS_PER_SEARCH: Record<string, number> = {
  linkedin: 7,
  careers_future: 10,
};

// =================================================================
// 3. ADVANCED SYSTEM SETTINGS (Modify with Caution)
// =================================================================
export const LLM_MAX_RPM = 10;
export const LLM_MAX_RETRIES = 3;
export const LLM_RETRY_BASE_DELAY = 10;
export const LLM_DAILY_REQUEST_BUDGET = 0;
export const LLM_REQUEST_DELAY_SECONDS = 8;

export const LINKEDIN_MAX_START = 1;
export const REQUEST_TIMEOUT = 30000; // in ms for JS
export const MAX_RETRIES = 3;
export const RETRY_DELAY_SECONDS = 15;

export const JOB_EXPIRY_DAYS = 30;
export const JOB_CHECK_DAYS = 3;
export const JOB_DELETION_DAYS = 60;
export const JOB_CHECK_LIMIT = 50;
export const ACTIVE_CHECK_TIMEOUT = 20000; // in ms
export const ACTIVE_CHECK_MAX_RETRIES = 2;
export const ACTIVE_CHECK_RETRY_DELAY = 10;

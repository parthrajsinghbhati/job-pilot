# Job Scraper & Application Assistant (Node.js/TypeScript)

This project is a comprehensive suite of tools designed to automate and enhance the job searching process, primarily focusing on LinkedIn. It scrapes job postings, parses resumes, scores job suitability against a candidate's resume, manages job application statuses, and generates custom PDF resumes.

The system has been migrated from Python to a modern **Node.js/Express/TypeScript** architecture for better performance, type safety, and scalability.

## Features

- **Job Scraping**: Automatically scrapes job postings from LinkedIn using Axios and Cheerio.
- **Resume Parsing**: Uses Groq LLM (via a rate-limited client) to parse resume text into structured JSON.
- **Job Scoring**: AI-driven scoring of job descriptions against your resume to determine suitability.
- **Background Tasks**: Automated job expiration checks and periodic scoring of new opportunities.
- **Custom PDF Generation**: Generates clean, ATS-friendly PDF resumes using Puppeteer.
- **Rate-Limited LLM Client**: Built-in token-bucket rate limiting to handle LLM API quotas gracefully.
- **Data Storage**: Fully integrated with Supabase for data storage and storage buckets.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Package Manager**: pnpm
- **AI/LLM**: Groq SDK (with Zod-driven structured output)
- **Scraping**: Axios, Cheerio, Turndown
- **PDF Generation**: Puppeteer
- **Database**: Supabase JS SDK
- **Validation**: Zod

## Setup and Installation

### Prerequisites
- Node.js (v18+)
- [pnpm](https://pnpm.io/installation) installed (`npm install -g pnpm`)

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/anandanair/linkedin-jobs-scrapper
   cd linkedin-jobs-scrapper
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   pnpm install
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   pnpm install
   ```

4. **Environment Configuration:**
   Create a `.env` file in the `backend` directory with the following keys:
   ```env
   LLM_API_KEY=your_groq_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

5. **Run the Application:**
   ```bash
   # Backend (from backend directory)
   pnpm run dev

   # Frontend (from frontend directory)
   pnpm run dev
   ```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/        # System configuration
│   │   ├── controllers/   # Express request handlers
│   │   ├── models/        # Zod schemas and TS types
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # Business logic (Scraper, LLM, Resume, PDF)
│   │   └── utils/         # Utilities (Supabase, UserAgents)
│   ├── server.ts          # Server entry point
│   └── package.json
├── frontend/              # Vite + React application
└── README.md
```

## License
MIT License

## Disclaimer
This project is for educational and personal use only. Scraping websites may be against their Terms of Service. Use responsibly.

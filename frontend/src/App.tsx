import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start font-sans">
      <header className="w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none tracking-tighter">J</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">JobPilot</h1>
        </div>
        
        <SignedIn>
          <UserButton afterSignOutUrl="/"/>
        </SignedIn>
      </header>

      <main className="w-full flex flex-col items-center justify-center p-6 text-center max-w-7xl mx-auto">
        <SignedOut>
          <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6 mt-20">
            The Autonomous AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Job Agent</span>
          </h2>
          <p className="text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl">
            Automate your job search. JobPilot scrapes, scores, and customizes your resume for perfect matches while you sleep.
          </p>
          <SignInButton mode="modal">
            <button className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-8 rounded-full shadow-lg shadow-slate-900/20 transition-all hover:scale-105 active:scale-95">
              Sign In to Dashboard
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <Dashboard />
        </SignedIn>
      </main>
    </div>
  );
}

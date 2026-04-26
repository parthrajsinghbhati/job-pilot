import { useEffect, useState } from "react";
import Dashboard from "./Dashboard";
import Auth from "./Auth";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    setIsAuthenticated(false);
  };

  const handleAuth = (userId: string) => {
    setIsAuthenticated(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start font-sans">
      <header className="w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none tracking-tighter">J</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">JobPilot</h1>
        </div>
        
        {isAuthenticated && (
          <button 
            onClick={handleSignOut}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign Out
          </button>
        )}
      </header>

      <main className="w-full flex flex-col items-center justify-center p-6 text-center max-w-7xl mx-auto">
        {!isAuthenticated ? (
          <>
            <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6 mt-10">
              The Autonomous AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Job Agent</span>
            </h2>
            <p className="text-xl text-slate-600 mb-6 leading-relaxed max-w-3xl">
              Automate your job search. JobPilot scrapes, scores, and customizes your resume for perfect matches while you sleep.
            </p>
            <Auth onAuth={handleAuth} />
          </>
        ) : (
          <Dashboard />
        )}
      </main>
    </div>
  );
}

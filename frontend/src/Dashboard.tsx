import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { ExternalLink, Search, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useUser();
  const [jobs, setJobs] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useState('India');
  const [activeQuery, setActiveQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('Agent is idle. Awaiting your command...');

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'https://job-pilot-8yvz.onrender.com';

  const fetchJobs = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${user.id}`);
      const data = await res.json();
      console.log('🔄 fetchJobs poll:', { count: data.jobs?.length });
      
      if (data.jobs && data.jobs.length > 0) {
        setJobs(data.jobs);
        setHasSearched(true);
        if (searching) {
          setSearching(false);
          setAgentStatus('✅ Jobs found! Check your results below.');
        }
      }
    } catch (err) {
      console.error('fetchJobs error:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000); 
    return () => clearInterval(interval);
  }, [searching, user]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    console.log('🚀 handleSearch called with:', searchQuery, 'user:', user.id);
    setSearching(true);
    setJobs([]); 
    setHasSearched(true);
    setActiveQuery(searchQuery); 
    setAgentStatus("🚀 Initializing JobPilot Agent v1.0...");


    console.log('📡 Calling backend at:', API_URL + '/scrape');

    try {
      const res = await fetch(`${API_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          location: location,
          user_id: user.id
        }),
      });
      console.log('✅ Backend responded:', res.status, res.statusText);
      const data = await res.json();
      console.log('📦 Response body:', data);
    } catch (err) {
      console.error('❌ Search failed:', err);
      setAgentStatus('⚠️ Connection failed. Check backend logs.');
      setSearching(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* AGENT CONSOLE */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all"></div>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${searching ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'} text-white shadow-lg`}>
            {searching ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Agentic Engine v1.0</span>
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <p className="text-slate-300 font-mono text-sm leading-relaxed">
              <span className="text-blue-500 mr-2">$</span>
              {agentStatus}
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="w-full bg-white p-6 rounded-3xl shadow-2xl shadow-blue-100/50 border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
          <Search className="text-slate-400 mr-2 h-5 w-5" />
          <input
            type="text"
            placeholder="What job should I find for you?"
            className="w-full bg-transparent border-none focus:outline-none text-slate-700 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 active:scale-95"
        >
          {searching ? 'Processing...' : 'Find Jobs'}
        </button>
      </div>

      {hasSearched && (
        <div className="w-full bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Recent Discoveries
              <span className="text-slate-400 font-normal">for "{activeQuery || 'Your Search'}"</span>
            </h2>
            {!searching && jobs.length > 0 && (
              <div className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100">
                {jobs.length} Found
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Company</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Job Title</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">LinkedIn</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      {searching ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          <p className="text-slate-500 italic font-medium animate-pulse">
                            Agent is hunting for "{activeQuery}" leads...
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400">No jobs found. Try a different query!</p>
                      )}
                    </td>
                  </tr>
                )}
                {jobs.map((job) => (
                  <tr key={job.job_id} className="border-b border-slate-50 hover:bg-blue-50/20 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-slate-900">{job.company}</td>
                    <td className="px-6 py-4">{job.job_title}</td>
                    <td className="px-6 py-4 text-center">
                      <a href={`https://www.linkedin.com/jobs/view/${job.job_id.split('_')[0]}/`} target="_blank" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                        Post <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-all opacity-0 group-hover:opacity-100 shadow-lg shadow-slate-200"
                         onClick={() => alert('Generating customized resume for ' + job.company + '...')}
                       >
                         Tailor Resume
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


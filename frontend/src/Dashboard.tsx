import { useEffect, useState } from 'react';
import { ExternalLink, Search, Loader2, Save, Download } from 'lucide-react';
import api from './api';

export default function Dashboard() {
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('user_id'));
  const [jobs, setJobs] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useState('India');
  const [activeQuery, setActiveQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('Agent is idle. Awaiting your command...');
  const [baseResume, setBaseResume] = useState<string>('');
  const [savingResume, setSavingResume] = useState(false);
  const [tailoringJobId, setTailoringJobId] = useState<string | null>(null);
  const [parsingResume, setParsingResume] = useState(false);

  useEffect(() => {
    setUserId(localStorage.getItem('user_id'));
  }, []);

  const fetchJobs = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/jobs/${userId}`);
      const { jobs } = res.data;
      
      if (jobs && jobs.length > 0) {
        setJobs(jobs);
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

  const fetchBaseResume = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/resume/${userId}`);
      if (res.data?.baseResume?.resume_data) {
        setBaseResume(JSON.stringify(res.data.baseResume.resume_data, null, 2));
      }
    } catch (err) {
      console.error('fetchBaseResume error:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchBaseResume();
    const interval = setInterval(fetchJobs, 3000); 
    return () => clearInterval(interval);
  }, [searching, userId]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userId) return;
    
    setSearching(true);
    setJobs([]); 
    setHasSearched(true);
    setActiveQuery(searchQuery); 
    setAgentStatus("🚀 Initializing JobPilot Agent v1.0...");

    try {
      await api.post('/scrape', {
        query: searchQuery,
        location: location,
        user_id: userId
      });
    } catch (err) {
      console.error('❌ Search failed:', err);
      setAgentStatus('⚠️ Connection failed. Check backend logs.');
      setSearching(false);
    }
  };

  const handleSaveResume = async () => {
    if (!baseResume.trim() || !userId) return;
    setSavingResume(true);
    try {
      let parsedResume;
      try {
        parsedResume = JSON.parse(baseResume);
      } catch (e) {
        alert('Invalid JSON format for base resume.');
        setSavingResume(false);
        return;
      }
      
      await api.post('/resume', {
        user_id: userId,
        resume_data: parsedResume
      });
      alert('Base resume saved successfully!');
    } catch (error) {
      console.error('Error saving resume:', error);
      alert('Failed to save resume.');
    } finally {
      setSavingResume(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setParsingResume(true);
    setAgentStatus("📄 Parsing your PDF resume with AI...");

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });

      const res = await api.post('/resume/parse', {
        user_id: userId,
        fileBase64: base64
      });

      if (res.data?.structuredData) {
        setBaseResume(JSON.stringify(res.data.structuredData, null, 2));
        alert('Resume parsed and saved successfully!');
        setAgentStatus("✅ Resume parsed! You can now start searching for jobs.");
      }
    } catch (error: any) {
      console.error('Error parsing PDF:', error);
      alert(error.response?.data?.error || 'Failed to parse PDF resume.');
      setAgentStatus("⚠️ Failed to parse PDF. Please try again.");
    } finally {
      setParsingResume(false);
    }
  };

  const handleTailorResume = async (jobId: string, company: string) => {
    if (!userId) return;
    setTailoringJobId(jobId);
    try {
      const res = await api.post(`/jobs/${jobId}/tailor`, { user_id: userId });
      const { customizedResume } = res.data;
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(customizedResume, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${company.replace(/\s+/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Customized resume generated and downloaded!');
    } catch (error: any) {
      console.error('Error tailoring resume:', error);
      alert(error.response?.data?.error || 'Failed to tailor resume.');
    } finally {
      setTailoringJobId(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* AGENT CONSOLE */}
      <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 group-hover:w-2 transition-all"></div>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${searching || parsingResume ? 'bg-blue-500 animate-pulse' : 'bg-slate-800'} text-white shadow-lg`}>
            {searching || parsingResume ? <Loader2 className="h-6 w-6 animate-spin" /> : <Search className="h-6 w-6" />}
          </div>
          <div className="flex-1 text-left">
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

      {/* BASE RESUME SECTION */}
      <div className="w-full bg-white p-6 rounded-3xl shadow-2xl shadow-blue-100/50 border border-slate-100 text-left">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Your Professional Profile</h3>
            <p className="text-sm text-slate-500">Upload your PDF resume to let the AI agent understand your background.</p>
          </div>
          <label className={`cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-200 ${parsingResume ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {parsingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 rotate-180" />}
            {parsingResume ? 'Parsing...' : 'Upload PDF Resume'}
            <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={parsingResume} />
          </label>
        </div>

        {baseResume && (
          <div className="mt-6">
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Currently Active Profile (JSON)
            </h4>
            <textarea
              value={baseResume}
              onChange={(e) => setBaseResume(e.target.value)}
              className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[12px] focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
            />
            <button
              onClick={handleSaveResume}
              disabled={savingResume}
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {savingResume ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        )}
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
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Score</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">LinkedIn</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
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
                    <td className="px-6 py-4 text-center font-bold">
                      {job.resume_score !== null ? (
                        <span className={`px-2 py-1 rounded-md ${job.resume_score >= 80 ? 'bg-green-100 text-green-700' : job.resume_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {job.resume_score}%
                        </span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a href={`https://www.linkedin.com/jobs/view/${job.job_id.split('_')[0]}/`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1">
                        Post <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button 
                         className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1 ml-auto disabled:opacity-50"
                         onClick={() => handleTailorResume(job.job_id, job.company)}
                         disabled={tailoringJobId === job.job_id}
                       >
                         {tailoringJobId === job.job_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
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

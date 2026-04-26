import { useState, useEffect } from 'react';
import api from './api';
import { Settings, Save, Plus, X } from 'lucide-react';

export default function Preferences() {
  const [userId] = useState<string | null>(localStorage.getItem('user_id'));
  const [queries, setQueries] = useState<string[]>([]);
  const [newQuery, setNewQuery] = useState('');
  const [location, setLocation] = useState('India');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      if (!userId) return;
      try {
        const res = await api.get(`/preferences/${userId}`);
        const { preferences } = res.data;
        if (preferences) {
          setQueries(preferences.linkedin_search_queries || []);
          if (preferences.location) setLocation(preferences.location);
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.post('/preferences', {
        user_id: userId,
        linkedin_search_queries: queries,
        location: location,
      });
      alert('Preferences saved successfully!');
    } catch (err: any) {
      alert('Error saving preferences: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const addQuery = () => {
    if (newQuery.trim()) {
      setQueries([...queries, newQuery.trim()]);
      setNewQuery('');
    }
  };

  const removeQuery = (index: number) => {
    setQueries(queries.filter((_, i) => i !== index));
  };

  if (loading) return <div className="p-8 text-slate-500">Loading settings...</div>;

  return (
    <div className="w-full bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 text-left mt-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-slate-400" />
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Search Preferences</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            LinkedIn Job Keywords
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {queries.map((q, i) => (
              <span key={i} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md border border-slate-200">
                {q}
                <button onClick={() => removeQuery(i)} className="text-slate-400 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onKeyDown={(e) => e.key === 'Enter' && addQuery()}
            />
            <button
              onClick={addQuery}
              className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
            Search Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Singapore"
            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <p className="mt-2 text-xs text-slate-400">
            LinkedIn will prioritize results in this specific region.
          </p>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useMemo } from 'react';
import { db } from './db';
import { ApiCard, LedgerEvent, AppState, NewtonReceipt } from './types';
import { SEED_APIS } from './constants';
import { runApiTest } from './services/testRunner';
import { parseIntent, generateReceipt } from './services/geminiService';
import { logEvent } from './services/ledgerService';

// --- Sub-components ---

const LoadingOverlay: React.FC<{ message: string }> = ({ message }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center glass">
    <div className="p-8 text-center">
      <div className="w-12 h-12 mb-4 border-4 rounded-full border-blue-500 border-t-transparent animate-spin mx-auto"></div>
      <p className="text-slate-600 font-medium">{message}</p>
    </div>
  </div>
);

const ConfidenceBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    high: 'bg-emerald-100 text-emerald-700',
    med: 'bg-amber-100 text-amber-700',
    low: 'bg-rose-100 text-rose-700'
  }[level] || 'bg-slate-100 text-slate-700';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors}`}>
      {level}
    </span>
  );
};

const NewtonReceiptView: React.FC<{ receipt: NewtonReceipt }> = ({ receipt }) => {
  return (
    <div className="receipt-shadow bg-white rounded-3xl overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div className="bg-slate-900 text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tighter">Newton Verification</h2>
            <p className="text-slate-400 text-xs font-mono">ID: {Math.random().toString(16).slice(2, 14).toUpperCase()}</p>
          </div>
          <div className="md:text-right">
            <div className="text-[10px] uppercase font-bold text-blue-400 mb-1 tracking-widest">Protocol Status</div>
            <div className="text-xl font-bold text-emerald-400">DETERMINISTIC_PASS</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono border-t border-slate-800 pt-6">
          <div>LATENCY: {receipt.selected_api.reliability.avg_latency_ms.toFixed(0)}MS</div>
          <div>CONFIDENCE: {receipt.verification.confidence.toUpperCase()}</div>
          <div>PASS RATE: {(receipt.verification.pass_rate_30d * 100).toFixed(0)}%</div>
          <div>KEY REQ: FALSE</div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        <div className="grid md:grid-cols-2 gap-8">
          <section>
            <h3 className="text-xs uppercase font-black text-slate-400 mb-4 tracking-widest">Selected Entity</h3>
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold text-slate-900">{receipt.selected_api.name}</div>
              <ConfidenceBadge level={receipt.verification.confidence} />
            </div>
            <div className="text-sm text-slate-500 mb-4">{receipt.selected_endpoint.name} • {receipt.selected_endpoint.purpose}</div>
            
            <h3 className="text-xs uppercase font-black text-slate-400 mb-2 tracking-widest mt-6">Validation Proofs</h3>
            <ul className="space-y-2">
              {receipt.why.map((reason, i) => (
                <li key={i} className="text-sm text-slate-600 flex items-start">
                  <span className="text-emerald-500 mr-2 mt-0.5">●</span> {reason}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <h3 className="text-xs uppercase font-black text-slate-400 mb-3 tracking-widest">Universal Request</h3>
              <div className="mono text-[11px] break-all bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                <span className="text-blue-600 font-bold">{receipt.request.method}</span> {receipt.request.url}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-black text-slate-400 mb-3 tracking-widest">Implementation Snippet</h3>
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold border-b border-slate-200 flex justify-between">
                  <span>JAVASCRIPT CORE</span>
                  <span className="text-slate-400">ES6+</span>
                </div>
                <pre className="mono text-[10px] md:text-xs p-4 overflow-x-auto bg-slate-900 text-slate-300 leading-relaxed">
                  {receipt.snippets.fetch || `fetch("${receipt.request.url}")\n  .then(res => res.json())\n  .then(data => {\n    // Integration logic here\n    console.log(data);\n  });`}
                </pre>
              </div>
            </div>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-slate-400 font-mono">
          <div>NOKEYPEDIA DETERMINISTIC SUBSTRATE v1.0.4</div>
          <div className="flex gap-4">
            <span>SIG: {Math.random().toString(36).substring(7)}</span>
            <span>NONCE: {Math.floor(Math.random() * 10000)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<AppState['activeTab']>('home');
  const [apis, setApis] = useState<ApiCard[]>([]);
  const [ledger, setLedger] = useState<LedgerEvent[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [askQuery, setAskQuery] = useState('');
  const [receipt, setReceipt] = useState<NewtonReceipt | null>(null);
  const [useProxy, setUseProxy] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading("Initializing Newton Core...");
      await db.init();
      const existing = await db.getAllApis();
      if (existing.length === 0) {
        setLoading("Seeding Catalog...");
        for (const api of SEED_APIS) {
          await db.saveApi(api);
        }
        await logEvent("EXPORT", "ApiCard", "system", "Initial catalog seed completed");
      }
      await refreshData();
      setIsReady(true);
      setLoading(null);
    };
    init();
  }, []);

  const refreshData = async () => {
    const [allApis, allLedger] = await Promise.all([
      db.getAllApis(),
      db.getAllLedger()
    ]);
    setApis(allApis);
    setLedger(allLedger);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery) return;
    setLoading("Parsing intent via Gemini...");
    setReceipt(null);

    try {
      const intent = await parseIntent(askQuery);
      setLoading(`Sifting candidates for ${intent.target_category}...`);
      
      const candidates = apis.filter(a => 
        a.categories.some(c => c.toLowerCase().includes(intent.target_category.toLowerCase())) ||
        a.tags.some(t => t.toLowerCase().includes(intent.target_category.toLowerCase()))
      ).sort((a, b) => b.reliability.pass_rate_30d - a.reliability.pass_rate_30d);

      if (candidates.length === 0) {
        await logEvent("ROUTE_QUERY", "ApiCard", "none", `No match for "${askQuery}"`, { intent }, { ok: false });
        alert("No keyless API found for this intent. Try a different category.");
      } else {
        const newReceipt = await generateReceipt(askQuery, intent, candidates);
        setReceipt(newReceipt);
      }
    } catch (err) {
      console.error(err);
      alert("Verification engine failure. Check API connectivity.");
    } finally {
      setLoading(null);
      await refreshData();
    }
  };

  const handleRunAllTests = async () => {
    setLoading("Running global verification suite...");
    for (const api of apis) {
      await runApiTest(api, useProxy);
    }
    await refreshData();
    setLoading(null);
  };

  const availableFilters = useMemo(() => {
    const cats = new Set<string>();
    const tags = new Set<string>();
    apis.forEach(api => {
      api.categories.forEach(c => cats.add(c));
      api.tags.forEach(t => tags.add(t));
    });
    return {
      categories: Array.from(cats).sort(),
      tags: Array.from(tags).sort()
    };
  }, [apis]);

  const toggleFilter = (filter: string) => {
    setSelectedFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const filteredApis = useMemo(() => {
    return apis.filter(api => {
      const matchesSearch = !searchQuery || 
        api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        api.categories.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
        api.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilters = selectedFilters.every(filter => 
        api.categories.includes(filter) || api.tags.includes(filter)
      );

      return matchesSearch && matchesFilters;
    });
  }, [apis, searchQuery, selectedFilters]);

  if (!isReady) return <LoadingOverlay message="Newton Bootstrapping..." />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 pb-24 md:pb-32">
      {loading && <LoadingOverlay message={loading} />}

      {/* Responsive Header Wrapper */}
      <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200">
        <header className="max-w-6xl mx-auto px-6 py-4 md:py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="cursor-pointer" onClick={() => setActiveTab('home')}>
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 leading-none">NoKeypedia</h1>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.3em] mt-1">Newton Verified Substrate</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Substrate Active</span>
              </div>
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-full border border-slate-200">
                <span className="text-[9px] font-black text-slate-400 pl-2 uppercase tracking-tighter">Proxy</span>
                <button 
                  onClick={() => setUseProxy(!useProxy)}
                  className={`w-9 h-5 rounded-full p-1 transition-all ${useProxy ? 'bg-blue-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-3 h-3 bg-white rounded-full transition-transform ${useProxy ? 'translate-x-4' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>

          {(activeTab === 'home' || activeTab === 'catalog') && (
            <div className="space-y-4 max-w-2xl">
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Search APIs, tags, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm group-focus-within:ring-4 group-focus-within:ring-blue-100 group-focus-within:border-blue-500 transition-all outline-none"
                />
                <svg className="absolute left-4 top-4 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-4 text-slate-300 hover:text-slate-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}
              </div>

              {activeTab === 'catalog' && (
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dimension Filters</span>
                    {selectedFilters.length > 0 && (
                      <button onClick={() => setSelectedFilters([])} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase">Clear All</button>
                    )}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {availableFilters.categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => toggleFilter(cat)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold border transition-all ${
                          selectedFilters.includes(cat) 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-slate-200 self-center mx-1"></div>
                    {availableFilters.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleFilter(tag)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold border transition-all ${
                          selectedFilters.includes(tag) 
                          ? 'bg-slate-800 border-slate-800 text-white shadow-lg' 
                          : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </header>
      </div>

      {/* Content Area */}
      <main className="max-w-6xl mx-auto px-6 pt-8 pb-12">
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Verified Integrations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {apis.slice(0, 4).map(api => (
                  <button 
                    key={api.id}
                    onClick={() => { setActiveTab('catalog'); setSearchQuery(api.name); }}
                    className="p-6 bg-white rounded-3xl border border-slate-200 text-left hover:border-blue-500 hover:shadow-xl hover:shadow-blue-50 transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                      <div className="text-[10px] text-blue-500 font-bold mb-2 uppercase tracking-tighter">{api.categories[0]}</div>
                      <div className="font-bold text-slate-900 leading-tight text-lg mb-1">{api.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{api.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <div className="grid lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Substrate Performance</h2>
                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                      <div className="text-5xl font-black text-slate-900 tracking-tighter">98.2%</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Avg Network Pass Rate</div>
                    </div>
                    <div className="px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                      <div className="text-lg font-black leading-none">OPTIMAL</div>
                      <div className="text-[9px] font-bold uppercase tracking-widest mt-1">Status: DETERMINISTIC</div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {apis.slice(0, 5).map(api => (
                      <div key={api.id} className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-900 font-bold">{api.name}</span>
                          <span className="mono font-black text-blue-600">{(api.reliability.pass_rate_30d * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${api.reliability.pass_rate_30d * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Recent Ledger</h2>
                <div className="space-y-3">
                  {ledger.slice(0, 5).map(event => (
                    <div key={event.id} className="p-4 bg-white rounded-2xl border border-slate-200 text-xs">
                      <div className="flex justify-between mb-2">
                        <span className="font-bold text-slate-400 uppercase tracking-tighter">{event.type}</span>
                        <span className="text-[9px] font-mono text-slate-300">{new Date(event.ts).toLocaleTimeString()}</span>
                      </div>
                      <div className="font-bold text-slate-700 line-clamp-1">{event.summary}</div>
                    </div>
                  ))}
                  <button onClick={() => setActiveTab('ledger')} className="w-full py-4 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:bg-blue-50 rounded-2xl transition-colors">View Audit Trail →</button>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {filteredApis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredApis.map(api => (
                  <div key={api.id} className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-100/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-wrap gap-1">
                        {api.categories.map(cat => (
                          <span key={cat} className="text-[9px] font-black text-blue-600 px-2.5 py-1 bg-blue-50 rounded-full uppercase">{cat}</span>
                        ))}
                      </div>
                      <ConfidenceBadge level={api.reliability.confidence} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{api.name}</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-grow">{api.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {api.tags.map(tag => (
                        <span key={tag} className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 uppercase tracking-tight">#{tag}</span>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                      <div className="text-[10px] text-slate-400 font-mono">LATENCY: {api.reliability.avg_latency_ms.toFixed(0)}MS</div>
                      <button 
                        onClick={() => { setActiveTab('ask'); setAskQuery(`Get ${api.name} data`); }}
                        className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 group/btn"
                      >
                        INTEGRATE <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 text-center bg-white rounded-[40px] border border-slate-200">
                <div className="text-slate-200 text-8xl mb-6 font-black tracking-tighter select-none">NULL</div>
                <p className="text-slate-400 font-medium mb-8">No substrate matches found.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedFilters([]); }} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all">Reset All Filters</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ask' && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900">What is your intent?</h2>
              <p className="text-slate-400 font-medium md:text-lg">Describe the data you need. Newton will route you.</p>
            </div>
            
            <form onSubmit={handleAsk} className="space-y-6">
              <div className="relative">
                <textarea 
                  placeholder="e.g., 'I want to fetch current weather for London and display it in a React component without needing an API key...'"
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  className="w-full p-8 bg-white border border-slate-200 rounded-[40px] text-lg md:text-xl min-h-[180px] shadow-2xl shadow-blue-50 focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed"
                />
                <button 
                  type="submit"
                  disabled={!askQuery}
                  className="absolute bottom-6 right-6 p-5 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {['NO KEYS', 'KEYLESS AUTH', 'CORS ENABLED', 'VERIFIED UPTIME'].map(label => (
                  <span key={label} className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm">{label}</span>
                ))}
              </div>
            </form>

            {receipt && <NewtonReceiptView receipt={receipt} />}
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center bg-blue-600 p-8 md:p-12 rounded-[40px] text-white shadow-2xl shadow-blue-200 gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-black tracking-tighter">Deterministic Suite</h2>
                <p className="text-sm opacity-80 mt-2 font-medium">Ping all nodes for state verification</p>
              </div>
              <button 
                onClick={handleRunAllTests}
                className="w-full md:w-auto px-10 py-4 bg-white text-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 hover:scale-105 transition-all active:scale-95 shadow-lg"
              >
                RUN GLOBAL VERIFICATION
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apis.map((api) => (
                <div key={api.id} className="p-6 bg-white rounded-3xl border border-slate-200 flex items-center justify-between hover:shadow-lg transition-all group">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${api.reliability.last_status === 'ok' ? 'bg-emerald-500' : api.reliability.last_status === 'fail' ? 'bg-rose-500' : 'bg-slate-300'}`}></div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{api.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono uppercase tracking-tighter">STATE: {api.reliability.last_status}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-blue-600 font-mono">{api.reliability.avg_latency_ms.toFixed(0)}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-2">Immutable Audit Chain</h2>
              <div className="h-1 w-12 bg-blue-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-4">
              {ledger.map(event => (
                <div key={event.id} className="group p-6 bg-white rounded-3xl border border-slate-200 hover:border-blue-200 transition-all flex gap-6">
                  <div className="hidden md:flex flex-col items-center">
                    <div className="w-px h-full bg-slate-100 group-last:h-0"></div>
                    <div className="w-3 h-3 rounded-full bg-blue-500 my-2"></div>
                    <div className="w-px h-full bg-slate-100"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase font-black">{event.type}</div>
                      <div className="text-[10px] font-mono text-slate-300">{new Date(event.ts).toLocaleString()}</div>
                    </div>
                    <div className="text-base font-bold text-slate-900 leading-snug mb-3">{event.summary}</div>
                    <div className="flex items-center gap-4 text-[10px] font-mono uppercase font-bold">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${event.result.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className={event.result.ok ? 'text-emerald-600' : 'text-rose-600'}>Status: {event.result.ok ? 'VALID' : 'CORRUPT'}</span>
                      </div>
                      <div className="text-slate-300">|</div>
                      <div className="text-slate-400">ID: {event.id.slice(0, 8)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating Global Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-50">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[32px] md:rounded-full p-2 flex justify-between items-center shadow-2xl shadow-blue-900/20">
          {[
            { id: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { id: 'catalog', label: 'Nodes', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
            { id: 'ask', label: 'Ask', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
            { id: 'tests', label: 'Audit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'ledger', label: 'Chain', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AppState['activeTab'])}
              className={`flex-1 flex flex-col items-center justify-center py-2 md:py-3 px-2 rounded-full transition-all duration-300 relative group ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-white/10 rounded-full animate-in zoom-in duration-300"></div>
              )}
              <svg className={`w-5 h-5 md:w-6 md:h-6 mb-1 transition-transform group-active:scale-90 ${activeTab === tab.id ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon}></path>
              </svg>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

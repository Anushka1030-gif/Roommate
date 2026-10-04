import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-3xl font-bold">
          🏠
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">RoomieMatch</h1>
          <p className="text-slate-400 text-sm mt-2">
            Student roommate matching platform development environment
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 text-left text-xs space-y-2 font-mono text-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Client:</span>
            <span className="text-emerald-400 font-semibold">Vite + React (Tailwind v4)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Server Proxy:</span>
            <span className="text-emerald-400 font-semibold">/api &rarr; :5000</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Environment:</span>
            <span className="text-indigo-400 font-semibold">Ready</span>
          </div>
        </div>
        <button
          id="counter-btn"
          type="button"
          onClick={() => setCount((c) => c + 1)}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition shadow-lg shadow-indigo-600/25 cursor-pointer"
        >
          Interactive Count: {count}
        </button>
      </div>
    </div>
  );
}

export default App;

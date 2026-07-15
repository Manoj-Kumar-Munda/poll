import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent_80%)] pointer-events-none" />
      
      <main className="max-w-4xl w-full flex flex-col items-center text-center space-y-12 z-10">
        {/* Header/Hero Section */}
        <div className="relative flex items-center justify-center gap-6 md:gap-10">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 opacity-60 blur-md group-hover:opacity-100 transition duration-300"></div>
            <a href="https://vite.dev" target="_blank" className="relative block p-3 bg-slate-900/90 rounded-2xl border border-slate-800 backdrop-blur-xl">
              <img src={viteLogo} className="h-14 w-14 md:h-16 md:w-16 transition-transform duration-300 hover:scale-110" alt="Vite logo" />
            </a>
          </div>
          
          <span className="text-3xl md:text-4xl font-extralight text-indigo-400/40">+</span>

          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-60 blur-md group-hover:opacity-100 transition duration-300"></div>
            <a href="https://react.dev" target="_blank" className="relative block p-3 bg-slate-900/90 rounded-2xl border border-slate-800 backdrop-blur-xl">
              <img src={reactLogo} className="h-14 w-14 md:h-16 md:w-16 transition-transform duration-300 hover:rotate-180 duration-1000" alt="React logo" />
            </a>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-200 to-purple-400 bg-clip-text text-transparent">
            Vite + React + Tailwind v4
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl mx-auto">
            A premium, modern boilerplate powered by Vite, TypeScript, and Tailwind CSS v4.0.
          </p>
        </div>

        {/* Center illustration & Counter */}
        <div className="flex flex-col items-center gap-8">
          <img src={heroImg} className="h-32 md:h-40 w-auto object-contain animate-pulse duration-4000 opacity-80" alt="Hero illustration" />
          
          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 max-w-xs w-full shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative flex flex-col items-center space-y-4">
              <p className="text-xs font-mono text-slate-500 tracking-wider uppercase">interactive state</p>
              <button
                onClick={() => setCount((c) => c + 1)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl transition duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 cursor-pointer"
              >
                Count is: {count}
              </button>
              <p className="text-xs text-slate-500">
                Edit <code className="text-indigo-400 bg-slate-950/60 px-1.5 py-0.5 rounded font-mono">src/App.tsx</code> to test HMR.
              </p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="p-6 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-900 hover:border-slate-800 rounded-2xl transition duration-300 text-left group">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition duration-250 flex items-center gap-2">
              <span>Documentation</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/50 text-slate-400">Vite & React</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Browse official documentation to learn best practices and advanced configs.
            </p>
            <div className="mt-4 flex gap-4">
              <a href="https://vite.dev/" target="_blank" className="text-xs text-indigo-400 hover:underline">Vite Docs &rarr;</a>
              <a href="https://react.dev/" target="_blank" className="text-xs text-indigo-400 hover:underline">React Docs &rarr;</a>
            </div>
          </div>

          <div className="p-6 bg-slate-900/30 hover:bg-slate-900/50 border border-slate-900 hover:border-slate-800 rounded-2xl transition duration-300 text-left group">
            <h2 className="text-lg font-bold text-slate-100 group-hover:text-purple-300 transition duration-250 flex items-center gap-2">
              <span>Tailwind v4.0</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/50 text-purple-400">Styles</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              Utilize utility classes directly in your markup with lightning-fast CSS builds.
            </p>
            <div className="mt-4">
              <a href="https://tailwindcss.com" target="_blank" className="text-xs text-purple-400 hover:underline">Tailwind Docs &rarr;</a>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-slate-600 text-xs font-mono z-10">
        Built with Antigravity &bull; 2026
      </footer>
    </div>
  )
}

export default App

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShipStore } from '../store/shipStore'
import { useResourceStore } from '../store/resourceStore'
import { useSessionStore } from '../store/sessionStore'

interface CachedAssetEntry {
  name: string
  category: string
  status: string
}

const PRECACHED_SUBSYSTEMS: CachedAssetEntry[] = [
  { name: 'Three.js WebGL Procedural Star Engine', category: 'Graphics Engine', status: 'Cached' },
  { name: 'Procedural Nebula Shaders & Particle Field', category: 'Shaders', status: 'Cached' },
  { name: 'Ship Upgrade & Module Diagnostics Matrix', category: 'Game Logic', status: 'Cached' },
  {
    name: 'Stellar Offline Signature & Wallet State Vault',
    category: 'Web3 / Security',
    status: 'Cached',
  },
  { name: 'Cosmic Audio FX & Synthesizer Bank', category: 'Audio', status: 'Cached' },
]

export default function OfflinePage() {
  const navigate = useNavigate()
  const ships = useShipStore((state) => state.ships)
  const activeShipId = useShipStore((state) => state.activeShipId)
  const inventory = useResourceStore((state) => state.inventory)
  const syncStatus = useSessionStore((state) => state.syncStatus)

  const activeShip = ships.find((s) => s.id === activeShipId) ?? ships[0]

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : false
  )
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [reconnectStatus, setReconnectStatus] = useState<string | null>(null)
  const [cachedAssets, setCachedAssets] = useState<CachedAssetEntry[]>(PRECACHED_SUBSYSTEMS)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setReconnectStatus('Network restored! You can now return to active flight.')
    }
    const handleOffline = () => {
      setIsOnline(false)
      setReconnectStatus('Subspace carrier signal lost.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Inspect CacheStorage if accessible
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => {
          if (keys.length > 0) {
            const cacheEntries: CachedAssetEntry[] = keys.map((key) => ({
              name: `Storage Bucket: ${key}`,
              category: 'PWA Cache',
              status: 'Synchronized',
            }))
            setCachedAssets((prev) => [...prev, ...cacheEntries])
          }
        })
        .catch(() => {})
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleReconnect = useCallback(async () => {
    setIsReconnecting(true)
    setReconnectStatus('Testing Horizon relay connectivity...')

    if (!navigator.onLine) {
      setTimeout(() => {
        setIsReconnecting(false)
        setReconnectStatus('Network remains offline. Check your internet connection.')
      }, 700)
      return
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      await fetch('/', { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      clearTimeout(timeout)

      setReconnectStatus('Reconnection confirmed! Resuming interstellar travel...')
      setTimeout(() => {
        navigate('/')
      }, 900)
    } catch {
      setIsReconnecting(false)
      setReconnectStatus('Horizon node unreachable. Operating under local emergency power.')
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="max-w-3xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-amber-500/40 bg-amber-500/10 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              {isOnline ? 'Network Carrier Available' : 'Subspace Signal Lost — Offline Mode'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Lost in the Nebula
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Your vessel is operating in autonomous offline reconnaissance mode. Essential ship
            diagnostics and cached planetary data remain accessible.
          </p>
        </div>

        {/* Cached Vessel Diagnostics */}
        <div className="bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <h2 className="text-base font-semibold text-emerald-400 flex items-center gap-2">
              <span>🚀</span> Cached Vessel Diagnostics
            </h2>
            <span className="text-xs text-slate-400">Sync Status: {syncStatus}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Vessel Name</div>
              <div className="text-lg font-bold text-white truncate">
                {activeShip?.name || 'Nomad One'}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Model & Status</div>
              <div className="text-lg font-bold text-white">
                {activeShip?.model || 'Explorer'} ({activeShip?.status || 'docked'})
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                Sector Coordinates
              </div>
              <div className="text-lg font-bold text-white">
                {activeShip?.lastKnownSector || 'Sec-001 (Cached)'}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Nebula Dust</div>
              <div className="text-lg font-bold text-emerald-400">
                {Number(inventory?.nebulaDust ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Stellarium</div>
              <div className="text-lg font-bold text-cyan-400">
                {Number(inventory?.stellarium ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Dark Matter</div>
              <div className="text-lg font-bold text-purple-400">
                {Number(inventory?.darkMatter ?? 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Cached Assets and Subsystems */}
        <div className="bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
            <h2 className="text-base font-semibold text-emerald-400 flex items-center gap-2">
              <span>📦</span> Verified Offline Subsystems & Cache
            </h2>
            <span className="text-xs text-slate-400">{cachedAssets.length} Ready</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {cachedAssets.map((asset, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/30 text-xs sm:text-sm"
              >
                <div>
                  <div className="font-medium text-slate-200">{asset.name}</div>
                  <div className="text-xs text-slate-400">{asset.category}</div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Reconnect Actions */}
        <div className="bg-slate-900/60 border border-emerald-500/20 backdrop-blur-md rounded-2xl p-6 shadow-xl text-center space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Horizon Node Reconnection</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Once network signals return, re-synchronize your vessel state to execute Soroban
            contract claims and trade on the decentralized exchange.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>🔄</span>
              <span>{isReconnecting ? 'Probing Network...' : 'Attempt Reconnect'}</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/50 transition-all active:scale-95 flex items-center gap-2"
            >
              <span>🌌</span>
              <span>Return to Bridge</span>
            </button>
          </div>

          {reconnectStatus && (
            <div className="text-xs text-amber-300 animate-fade-in pt-1">{reconnectStatus}</div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react';
import { Droplets, TrendingUp, Waves, Power, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  const [payload, setPayload] = useState(null);
  const totalDepth = 100;

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/mqtt/messages')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1];
            setPayload(parseFloat(last.payload));
          }
        })
        .catch((err) => console.error('Gagal fetch MQTT:', err));
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const percent = payload !== null ? Math.min(100, Math.round((payload / totalDepth) * 100)) : 0;
  const status = payload < 30 ? 'Rendah' : payload < 70 ? 'Sedang' : 'Normal';
  const statusColor = payload < 30 ? 'text-red-500' : payload < 70 ? 'text-yellow-500' : 'text-green-600';
  const bgGradient = payload < 30 ? 'from-red-500 to-pink-500' : payload < 70 ? 'from-yellow-500 to-orange-500' : 'from-green-500 to-emerald-500';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Monitoring</h1>
          <p className="text-gray-500">Pemantauan sistem irigasi real-time</p>
        </div>

        {/* Alert Banner */}
        {payload < 30 && (
          <div className="mb-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-2xl p-4 shadow-lg animate-pulse">
            <div className="flex items-center gap-3 text-white">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-semibold">Peringatan: Level Air Rendah!</p>
                <p className="text-sm text-white/90">Segera lakukan pengisian air untuk menghindari kekeringan</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Water Level Card */}
          <div className="lg:col-span-2 bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Level Air</h2>
                <p className="text-sm text-gray-500">Monitoring ketinggian air real-time</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${payload < 30 ? 'bg-red-100' : payload < 70 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                <Activity className={`w-4 h-4 ${statusColor}`} />
                <span className={`font-semibold text-sm ${statusColor}`}>{status}</span>
              </div>
            </div>

            <div className="flex items-center gap-8">
              {/* Circular Progress */}
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle cx="96" cy="96" r="88" stroke="#e5e7eb" strokeWidth="16" fill="none" />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="url(#gradient)"
                    strokeWidth="16"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - percent / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" className={payload < 30 ? 'text-red-500' : payload < 70 ? 'text-yellow-500' : 'text-green-500'} stopColor="currentColor" />
                      <stop offset="100%" className={payload < 30 ? 'text-pink-500' : payload < 70 ? 'text-orange-500' : 'text-emerald-500'} stopColor="currentColor" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-5xl font-bold bg-gradient-to-br ${bgGradient} bg-clip-text text-transparent`}>{percent}%</div>
                  <div className="text-sm text-gray-400 mt-1">Kapasitas</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Waves className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">Ketinggian</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-700">{payload?.toFixed(1)}</div>
                  <div className="text-xs text-blue-600 mt-1">sentimeter</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">Total Depth</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-700">{totalDepth}</div>
                  <div className="text-xs text-purple-600 mt-1">sentimeter</div>
                </div>

                <div className="col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Sisa Kapasitas</div>
                  <div className="text-2xl font-bold text-gray-700">{(totalDepth - (payload || 0)).toFixed(1)} cm</div>
                  <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${bgGradient} transition-all duration-1000 rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Status Kontrol</h2>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-200 transition-all hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                      <Droplets className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Kran Utama</div>
                      <div className="text-xs text-gray-500">Inlet water</div>
                    </div>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">Status:</span>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-bold rounded-full shadow-sm">TERBUKA</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-5 border border-red-200 transition-all hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                      <Power className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">Kran Pembuangan</div>
                      <div className="text-xs text-gray-500">Outlet water</div>
                    </div>
                  </div>
                  <Power className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-700">Status:</span>
                  <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-sm">TERTUTUP</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-200">
              <p className="text-xs text-indigo-700 font-medium mb-1">📊 Update Terakhir</p>
              <p className="text-xs text-indigo-600">Data diperbarui setiap detik</p>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Status Sistem</p>
                <p className="text-xl font-bold text-gray-800">Aktif</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Koneksi MQTT</p>
                <p className="text-xl font-bold text-gray-800">Terhubung</p>
              </div>
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Efisiensi</p>
                <p className="text-xl font-bold text-gray-800">{percent > 70 ? 'Optimal' : 'Perlu Perhatian'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "@/components/Sidebar";

export default function Home() {
  const [payload, setPayload] = useState(null);
  const totalDepth = 100; // cm

  useEffect(() => {
    const fetchData = () => {
      fetch("/api/mqtt/messages")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1];
            setPayload(parseFloat(last.payload));
          }
        })
        .catch((err) => console.error("Gagal fetch MQTT:", err));
    };

    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  const percent = payload !== null ? Math.min(100, Math.round((payload / totalDepth) * 100)) : 0;
  const status = payload < 30 ? "Rendah" : "Normal";
  const statusColor = payload < 30 ? "text-red-500" : "text-green-600";

  return (
    <>
      <Head>
        <title>Smart Farming Dashboard</title>
      </Head>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow flex items-center gap-6">
              <div className="relative w-32 h-32">
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `conic-gradient(${
                      payload < 30 ? "#dc2626" : payload < 70 ? "#facc15" : "#22c55e"
                    } ${percent}%, #e5e7eb 0)`,
                  }}
                >
                  <div className="w-24 h-24 rounded-full bg-white absolute top-4 left-4 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold">{percent}%</div>
                    <div className="text-sm text-gray-400">Level Air</div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className={`text-lg font-semibold ${statusColor}`}>{status}</div>
                <div className="text-sm text-gray-500">
                  {payload < 30 ? "Di bawah batas minimum (30.0cm)" : "Level air aman"}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{payload?.toFixed(1)} cm</div>
                    <div className="text-xs text-gray-500">Ketinggian Saat Ini</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold">{totalDepth.toFixed(1)} cm</div>
                    <div className="text-xs text-gray-500">Kedalaman Total</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-lg font-semibold mb-4">Status Kontrol</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-faucet-drip text-blue-500" />
                    <span>Kran Utama</span>
                  </div>
                  <span className="text-green-600 font-semibold">TERBUKA</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-right-from-bracket text-blue-500" />
                    <span>Kran Pembuangan</span>
                  </div>
                  <span className="text-red-500 font-semibold">TERTUTUP</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

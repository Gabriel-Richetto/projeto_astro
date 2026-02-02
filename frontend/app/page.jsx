'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_ASTRO_API_URL;

const formatLongitude = (longitude) => {
  const signs = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
  ];
  const degree = Math.floor(longitude);
  const signIndex = Math.floor(degree / 30) % 12;
  const signDegree = (longitude % 30).toFixed(2);
  
  return `${signDegree}° ${signs[signIndex]}`;
};


export default function Page() {
  const [city, setCity] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!API_URL) {
      setError("500: Internal Server Error");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/chart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, date, time })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Erro desconhecido ao calcular o mapa.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-8">
      <h1 className="text-4xl font-bold text-center text-purple-300 mb-8">
        Mapa Astral
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto p-6 bg-black/50 rounded-xl shadow-lg border border-purple-800"
      >
        <label className="block mb-2 font-semibold text-purple-200">Cidade de Nascimento</label>
        <input
          type="text"
          className="w-full p-3 mb-6 rounded-lg bg-black/40 border border-purple-700"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />

        <label className="block mb-2 font-semibold text-purple-200">Data de Nascimento</label>
        <input
          type="date"
          className="w-full p-3 mb-6 rounded-lg bg-black/40 border border-purple-700"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label className="block mb-2 font-semibold text-purple-200">Hora de Nascimento</label>
        <input
          type="time"
          className="w-full p-3 mb-6 rounded-lg bg-black/40 border border-purple-700"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />

        <button
          className="w-full bg-purple-600 hover:bg-purple-500 transition p-3 rounded-xl font-bold disabled:bg-gray-500"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Calculando...' : 'Gerar Mapa'}
        </button>
      </form>

      {error && <p className="text-red-400 text-center mt-6">Erro: {error}</p>}

      {result && (
        <div className="max-w-2xl mx-auto mt-10 bg-black/40 p-6 rounded-2xl border border-purple-700/40">
          <h2 className="text-2xl font-bold text-purple-300 mb-4">
            Resultado para {result.cidade}
          </h2>

          <p className="text-lg mb-4">
            <strong>Ascendente:</strong> {formatLongitude(result.ascendente)}
          </p>
          <p className="text-lg mb-4">
            <strong>Meio do Céu (MC):</strong> {formatLongitude(result.meioDoCeu)}
          </p>
          
          <h3 className="text-xl font-semibold mt-6 mb-3 text-purple-300">Planetas</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(result.planetas).map(([planet, longitude]) => (
              <div key={planet} className="p-3 bg-purple-900/30 rounded-lg">
                <strong className="capitalize">{planet}:</strong>
                <p className="text-purple-200">{formatLongitude(longitude)}</p>
              </div>
            ))}
          </div>

          <details className="mt-8 border-t border-purple-700/50 pt-4">
            <summary className="cursor-pointer text-purple-400 font-semibold">Detalhes Técnicos</summary>
            <div className="mt-3 text-sm">
                <p>Latitude/Longitude: {result.detalhes.latitude.toFixed(4)}°, {result.detalhes.longitude.toFixed(4)}°</p>
                <p>Timezone: {result.detalhes.timezone}</p>
                <p>Data/Hora UTC: {new Date(result.detalhes.dataHoraUTC).toLocaleString('pt-BR', { timeZone: 'UTC' })}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
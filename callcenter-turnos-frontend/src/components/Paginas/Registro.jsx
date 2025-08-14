// src/components/Paginas/Registro.jsx
import React, { useState } from 'react';

export default function Registro() {
  const [cedula, setCedula] = useState('');
  const [fecha, setFecha] = useState('');       // puede venir como "YYYY-MM-DD" (date) o "DD/MM/YYYY"
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null); // { nombre, turno }

  // Normaliza a YYYY-MM-DD
  const toSqlDate = (raw) => {
    if (!raw) return '';
    const s = raw.trim();

    // Ya está en YYYY-MM-DD (input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/MM/YYYY
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      const [, d, m, y] = m1;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // DD-MM-YYYY
    const m2 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m2) {
      const [, d, m, y] = m2;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Si llega en otro formato, lo devolvemos tal cual (deja que el backend falle con mensaje)
    return s;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResultado(null);
    setCargando(true);

    try {
      const fechaSql = toSqlDate(fecha); // <-- normalización aquí
      const resp = await fetch('/api/buscar-turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cedula: cedula.trim(),
          fecha_nacimiento: fechaSql
        })
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al iniciar sesión');

      setResultado(data); // { nombre, turno }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '2rem auto', padding: 16 }}>
      <h2>Ingresar</h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <div>
          <label>Cédula</label>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="111506305"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div>
          <label>Fecha de nacimiento</label>
          {/* Puedes cambiar type="date" por type="text" si prefieres escribir 11/08/1980 */}
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
          {/* Si prefieres texto libre: 
            <input type="text" placeholder="DD/MM/YYYY o YYYY-MM-DD" ... />
          */}
        </div>

        <button type="submit" disabled={cargando} style={{ padding: 10 }}>
          {cargando ? 'Consultando...' : 'Entrar'}
        </button>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {resultado && (
          <div style={{ marginTop: 8, background: '#f6f6f6', padding: 10 }}>
            <strong>{resultado.nombre}</strong> — Turno: {resultado.turno}
          </div>
        )}
      </form>
    </div>
  );
}

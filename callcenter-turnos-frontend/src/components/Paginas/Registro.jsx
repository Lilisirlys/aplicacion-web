// src/components/Paginas/Registro.jsx
import React, { useState, useEffect } from 'react';

const API = 'http://localhost:5000'; // backend (server.js) debe estar escuchando aquí

export default function Registro() {
  // 🔎 Log al montar el componente (debe verse en la consola del navegador)
  useEffect(() => {
    console.log('Registro.jsx LOADED');
    console.log('API_BASE =', API);
  }, []);

  const [cedula, setCedula] = useState('');
  const [fecha, setFecha] = useState('');   // <input type="date"> -> YYYY-MM-DD
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [agente, setAgente] = useState(null);

  // Solo números en cédula
  const onCedula = (e) => {
    const v = e.target.value.replace(/\D/g, '').trim();
    setCedula(v);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setAgente(null);

    if (!cedula) return setMensaje('Ingresa la cédula.');
    if (!fecha) return setMensaje('Selecciona la fecha de nacimiento.');

    try {
      setCargando(true);

      // Debug útil
      console.log('Enviando a API:', { cedula, fecha_nacimiento: fecha });

      const resp = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, fecha_nacimiento: fecha }) // YYYY-MM-DD
      });

      // Intenta parsear JSON; si no, cae a texto
      let data = {};
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        try { data = await resp.json(); } catch {}
      } else {
        data.message = await resp.text();
      }

      console.log('Respuesta API:', resp.status, data);

      if (!resp.ok || !data.ok) {
        if (resp.status === 401) return setMensaje('Credenciales inválidas');
        if (resp.status === 400) return setMensaje(data.message || 'Solicitud inválida');
        if (resp.status === 500) return setMensaje('Error del servidor');
        return setMensaje(data.message || `Error al iniciar sesión (HTTP ${resp.status})`);
      }

      setAgente(data.agente);
      setMensaje('¡Ingreso exitoso!');
    } catch (err) {
      console.error('Error de red:', err);
      setMensaje('No se pudo conectar con la API.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', padding: 16 }}>
      <h2>Ingresar</h2>
      <form onSubmit={onSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label>
            Cédula
            <input
              type="text"
              inputMode="numeric"
              placeholder="Solo números"
              value={cedula}
              onChange={onCedula}
              maxLength={20}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </label>

          <label>
            Fecha de nacimiento
            <input
              type="date"               // devuelve YYYY-MM-DD
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </label>

          <button
            type="submit"
            disabled={cargando}
            style={{ padding: 10, fontWeight: 600 }}
          >
            {cargando ? 'Consultando...' : 'Entrar'}
          </button>
        </div>
      </form>

      {mensaje && (
        <p style={{ marginTop: 12, color: mensaje.includes('exitoso') ? 'green' : 'crimson' }}>
          {mensaje}
        </p>
      )}

      {agente && (
        <div style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
          <p><b>Cédula:</b> {agente.cedula}</p>
          <p><b>Nombre:</b> {agente.nombres} {agente.apellidos}</p>
          <p><b>Turno:</b> {agente.turno}</p>
        </div>
      )}
    </div>
  );
}

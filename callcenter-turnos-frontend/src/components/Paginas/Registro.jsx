// src/components/Paginas/Registro.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Usa el proxy del frontend (package.json -> "proxy": "http://localhost:8013")
const API = ""; // si quieres saltarte el proxy: "http://localhost:8013"

export default function Registro() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 👇 Aquí va el useEffect que consultará /api/turnos con la cédula del login
  useEffect(() => {
    const c = localStorage.getItem("cedula");
    if (!c) {
      // si no hay login, vuelve al inicio
      navigate("/");
      return;
    }

    setLoading(true);
    fetch(`${API}/api/turnos?cedula=${encodeURIComponent(c)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data.ok === false) {
          throw new Error(data.msg || `Error (HTTP ${r.status})`);
        }
        setTurnos(Array.isArray(data.turnos) ? data.turnos : []);
      })
      .catch((err) => setError(err.message || "Error consultando turnos"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: "0 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Mis turnos</h2>
        <button onClick={logout}>Cerrar sesión</button>
      </div>

      {loading && <p>Cargando…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {!loading && !error && turnos.length === 0 && <p>No hay turnos para mostrar.</p>}

      {!loading && !error && turnos.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Fecha</th>
                <th style={{ textAlign: "left", padding: 8 }}>Inicio</th>
                <th style={{ textAlign: "left", padding: 8 }}>Fin</th>
                <th style={{ textAlign: "left", padding: 8 }}>Tipo</th>
                <th style={{ textAlign: "left", padding: 8 }}>Sede</th>
                <th style={{ textAlign: "left", padding: 8 }}>Área</th>
                <th style={{ textAlign: "left", padding: 8 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id}>
                  <td style={{ padding: 8 }}>{t.fecha_turno?.slice(0, 10)}</td>
                  <td style={{ padding: 8 }}>{t.hora_inicio?.slice(0, 5)}</td>
                  <td style={{ padding: 8 }}>{t.hora_fin?.slice(0, 5)}</td>
                  <td style={{ padding: 8 }}>{t.tipo_turno}</td>
                  <td style={{ padding: 8 }}>{t.sede}</td>
                  <td style={{ padding: 8 }}>{t.area}</td>
                  <td style={{ padding: 8 }}>{t.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

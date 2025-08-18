// src/components/Paginas/Turnos.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Turnos() {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const c = localStorage.getItem("cedula");
    if (!c) { navigate("/"); return; }  // si no hay login, vuelve al inicio

    fetch(`/api/turnos?cedula=${encodeURIComponent(c)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data.ok === false) {
          throw new Error(data.msg || `Error (HTTP ${r.status})`);
        }
        setTurnos(data.turnos || []);
      })
      .catch((err) => setError(err.message || "Error consultando turnos"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const logout = () => { localStorage.clear(); navigate("/"); };

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
                <th>Fecha</th><th>Inicio</th><th>Fin</th>
                <th>Tipo</th><th>Sede</th><th>Área</th><th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((t) => (
                <tr key={t.id}>
                  <td>{t.fecha_turno?.slice(0,10)}</td>
                  <td>{t.hora_inicio?.slice(0,5)}</td>
                  <td>{t.hora_fin?.slice(0,5)}</td>
                  <td>{t.tipo_turno}</td>
                  <td>{t.sede}</td>
                  <td>{t.area}</td>
                  <td>{t.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

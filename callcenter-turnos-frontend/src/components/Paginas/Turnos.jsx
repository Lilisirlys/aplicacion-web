// src/components/Paginas/Turnos.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// util: fecha a YYYY-MM-DD (corrigiendo TZ)
const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const fmtTime = (t) => (t ? t.slice(0, 5) : "—");

export default function Turnos() {
  const navigate = useNavigate();

  // Identidad del agente
  const agente = (() => {
    try { return JSON.parse(localStorage.getItem("agente")); } catch { return null; }
  })();
  const cedula = agente?.cedula || localStorage.getItem("cedula") || "";

  const [fechaSel, setFechaSel] = useState(new Date()); // día elegido en calendario
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cargar turnos del día seleccionado
  async function loadDay(dateObj) {
    if (!cedula) return;
    const f = ymd(dateObj);
    try {
      setError("");
      setLoading(true);
      const resp = await fetch(`/api/turnos/dia?cedula=${encodeURIComponent(cedula)}&fecha=${f}`);
      let data;
      try { data = await resp.clone().json(); } catch { data = { ok: false, msg: await resp.text() }; }
      if (!resp.ok || data.ok === false) {
        throw new Error(data.msg || `Error (HTTP ${resp.status})`);
      }
      setTurnos(data.turnos || []);
    } catch (e) {
      console.error(e);
      setTurnos([]);
      setError(e.message || "No se pudieron cargar los turnos.");
    } finally {
      setLoading(false);
    }
  }

  // Al montar/verificar sesión y la primera carga del día actual
  useEffect(() => {
    if (!cedula) {
      navigate("/");
      return;
    }
    loadDay(fechaSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula]);

  // Handler del calendario
  const onPick = (date) => {
    if (!date) return;
    setFechaSel(date);
    loadDay(date);
  };

  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", padding: "0 12px" }}>
      <h2 style={{ margin: "0 0 12px" }}>Mis turnos</h2>

      {/* Calendario mensual inline */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 24 }}>
        <div>
          <DatePicker
            inline
            selected={fechaSel}
            onChange={onPick}
            dateFormat="dd/MM/yyyy"
            locale="es"
          />
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>
            {fechaSel.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </h3>

          {loading && <p>Cargando…</p>}
          {error && <p style={{ color: "crimson" }}>{error}</p>}

          {(!loading && !error && turnos.length === 0) && (
            <p>No hay turnos para mostrar en este día.</p>
          )}

          {turnos.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: "8px 6px" }}>Inicio</th>
                  <th style={{ padding: "8px 6px" }}>Fin</th>
                  <th style={{ padding: "8px 6px" }}>Tipo</th>
                  <th style={{ padding: "8px 6px" }}>Sede</th>
                  <th style={{ padding: "8px 6px" }}>Área</th>
                  <th style={{ padding: "8px 6px" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {turnos.map((t, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={{ padding: "8px 6px" }}>{fmtTime(t.hora_inicio)}</td>
                    <td style={{ padding: "8px 6px" }}>{fmtTime(t.hora_fin)}</td>
                    <td style={{ padding: "8px 6px" }}>{t.tipo || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{t.sede || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{t.area || "—"}</td>
                    <td style={{ padding: "8px 6px" }}>{t.estado || "Programado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

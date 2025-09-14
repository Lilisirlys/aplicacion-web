// src/components/Paginas/Calendario.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

// ↑ Config de API para el FRONT (lee .env del frontend)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

// Corrige zona horaria y devuelve YYYY-MM-DD
const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

// ✅ fmtTime mejorado
const fmtTime = (t) => (t && typeof t === "string" ? t.slice(0, 5) : "—");

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const daysBetween = (start, end) => {
  const out = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) out.push(new Date(d));
  return out;
};

// Ventana con datos cargados en tu BD
const MIN_DATE = new Date("2025-09-01");
const MAX_DATE = new Date("2025-12-31");

export default function Calendario() {
  const navigate = useNavigate();

  // Identidad del asesor
  const agente = (() => {
    try {
      return JSON.parse(localStorage.getItem("agente"));
    } catch {
      return null;
    }
  })();
  const cedula = agente?.cedula || localStorage.getItem("cedula") || "";

  // --- Estado UI ---
  const [modo, setModo] = useState("dia"); // "dia" | "rango"
  const [fecha, setFecha] = useState(new Date("2025-09-01")); // empieza donde hay datos
  const [rango, setRango] = useState([null, null]); // o [new Date("2025-09-01"), new Date("2025-09-30")]
  const [loading, setLoading] = useState(false);
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState("");

  const [startDate, endDate] = rango;

  useEffect(() => {
    if (!cedula) {
      // navigate("/"); // descomenta si tu app debe forzar login
    }
  }, [cedula, navigate]);

  async function cargarDia(d) {
    setError("");
    setTurnos([]);
    if (!cedula) {
      setError("No se encontró la cédula del agente (revisa el login/localStorage).");
      return;
    }
    setLoading(true);
    const f = ymd(d);
    try {
      const res = await fetch(
        `${API_BASE}/api/turnos/dia?cedula=${encodeURIComponent(cedula)}&fecha=${f}`
      );
      if (!res.ok) throw new Error("Respuesta no OK");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.turnos || [];
      setTurnos(arr);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar los turnos del día.");
    } finally {
      setLoading(false);
    }
  }

  async function cargarRango(s, e) {
    setError("");
    setTurnos([]);
    if (!cedula) {
      setError("No se encontró la cédula del agente (revisa el login/localStorage).");
      return;
    }
    if (!s || !e) {
      setError("Selecciona un rango válido.");
      return;
    }
    setLoading(true);
    const desde = ymd(s);
    const hasta = ymd(e);

    try {
      // 1) Intento /api/turnos/rango si existe
      const urlRango = `${API_BASE}/api/turnos/rango?cedula=${encodeURIComponent(
        cedula
      )}&desde=${desde}&hasta=${hasta}`;
      const r1 = await fetch(urlRango);
      if (r1.ok) {
        const data = await r1.json();
        const arr = Array.isArray(data) ? data : data?.turnos || [];
        setTurnos(arr);
        return;
      }

      // 2) Fallback: día a día con /api/turnos/dia
      const fechas = daysBetween(s, e).map(ymd);
      const peticiones = fechas.map((f) =>
        fetch(
          `${API_BASE}/api/turnos/dia?cedula=${encodeURIComponent(cedula)}&fecha=${f}`
        ).then((res) => (res.ok ? res.json() : []))
      );
      const porDia = await Promise.all(peticiones);

      const combinados = porDia
        .flatMap((x) => (Array.isArray(x) ? x : x?.turnos || []))
        .filter(Boolean);

      setTurnos(combinados);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los turnos del rango.");
    } finally {
      setLoading(false);
    }
  }

  // Agrupa por fecha para mostrar bonito en ambos modos
  const agrupados = useMemo(() => {
    const g = {};
    for (const t of turnos) {
      const f = t.fecha || t.fecha_turno || t.dia || t.date || "—";
      (g[f] = g[f] || []).push(t);
    }
    return g;
  }, [turnos]);

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>Calendario de turnos</h2>

      {/* Selector de modo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setModo("dia")} style={btn(modo === "dia")}>
          Por día
        </button>
        <button onClick={() => setModo("rango")} style={btn(modo === "rango")}>
          Por rango
        </button>
      </div>

      {/* Controles según el modo */}
      {modo === "dia" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <DatePicker
            locale="es"
            selected={fecha}
            onChange={setFecha}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            dateFormat="yyyy-MM-dd"
            placeholderText="Selecciona fecha (sep–dic 2025)"
            className="date-input"
          />
          <button
            onClick={() => cargarDia(fecha)}
            disabled={loading || !fecha}
            style={callToAction(loading || !fecha)}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <DatePicker
            locale="es"
            selectsRange
            startDate={startDate}
            endDate={endDate}
            onChange={(upd) => setRango(upd)}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
            dateFormat="yyyy-MM-dd"
            isClearable
            placeholderText="Selecciona rango (sep–dic 2025)"
            className="date-input"
          />
          <button
            onClick={() => cargarRango(startDate, endDate)}
            disabled={loading || !startDate || !endDate}
            style={callToAction(loading || !startDate || !endDate)}
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#ffe0e0",
            color: "#8a0000",
            padding: "8px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && turnos.length === 0 && !error && (
        <p style={{ opacity: 0.7 }}>
          {modo === "dia"
            ? "Elige una fecha y haz clic en Buscar."
            : "Elige un rango y haz clic en Buscar."}
        </p>
      )}

      {/* Render de resultados (tabla agrupada por fecha) */}
      {Object.keys(agrupados).map((f) => (
        <div
          key={f}
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <strong>{f}</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {agrupados[f].length} turno(s)
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={th}>Inicio</th>
                  <th style={th}>Fin</th>
                  <th style={th}>Proyecto</th>
                  <th style={th}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {agrupados[f].map((t, i) => (
                  <tr key={i}>
                    <td style={td}>
                      {fmtTime(t.hora_inicio || t.horaInicio || t.inicio)}
                    </td>
                    <td style={td}>
                      {fmtTime(t.hora_fin || t.horaFin || t.fin)}
                    </td>
                    <td style={td}>{t.proyecto || t.campaña || "—"}</td>
                    <td style={td}>{t.observacion || t.nota || t.tipo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

const th = {
  textAlign: "left",
  borderBottom: "1px solid #eee",
  padding: "8px 6px",
};

const td = {
  borderBottom: "1px solid #f5f5f5",
  padding: "8px 6px",
};

const btn = (active) => ({
  border: "none",
  padding: "6px 10px",
  borderRadius: 8,
  fontWeight: 700,
  background: active ? "#ff6a00" : "#fff",
  color: active ? "#fff" : "#ff6a00",
  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  cursor: "pointer",
});

const callToAction = (disabled) => ({
  padding: "8px 16px",
  borderRadius: 8,
  border: "none",
  background: disabled ? "#ffb98a" : "#ff6a00",
  color: "#fff",
  fontWeight: "bold",
  cursor: disabled ? "not-allowed" : "pointer",
});

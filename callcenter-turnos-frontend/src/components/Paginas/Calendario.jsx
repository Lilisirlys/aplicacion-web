// src/components/Paginas/Calendario.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

// Corrige zona horaria y devuelve YYYY-MM-DD
const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const fmtTime = (t) => (t ? t.slice(0, 5) : "—");

export default function Calendario() {
  const navigate = useNavigate();

  // Identidad del asesor
  const agente = (() => {
    try { return JSON.parse(localStorage.getItem("agente")); } catch { return null; }
  })();
  const cedula = agente?.cedula || localStorage.getItem("cedula") || "";

  // Estado UI
  const [fechasSel, setFechasSel] = useState([new Date()]); // selección múltiple (1..N)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [turnosPorDia, setTurnosPorDia] = useState({}); // { 'YYYY-MM-DD': [turnos...] }

  // Cargar turnos de un array de fechas
  async function loadDays(dates) {
    if (!cedula || !dates?.length) return;

    const uniqueKeys = [...new Set(dates.map(ymd))]; // evita repetidos
    setLoading(true);
    setError("");
    try {
      const results = {};
      // pide cada día (sencillo y claro). Si luego quieres, hago un endpoint por rango.
      for (const key of uniqueKeys) {
        const resp = await fetch(`/api/turnos/dia?cedula=${encodeURIComponent(cedula)}&fecha=${key}`);
        let data;
        try { data = await resp.clone().json(); } catch { data = { ok: false, msg: await resp.text() }; }
        if (!resp.ok || data.ok === false) {
          throw new Error(data.msg || `Error obteniendo ${key} (HTTP ${resp.status})`);
        }
        results[key] = data.turnos || [];
      }
      setTurnosPorDia(results);
    } catch (e) {
      console.error(e);
      setTurnosPorDia({});
      setError(e.message || "No se pudieron cargar los turnos.");
    } finally {
      setLoading(false);
    }
  }

  // Al montar: si no hay cedula, vuelve a login. Carga el día actual.
  useEffect(() => {
    if (!cedula) {
      navigate("/");
      return;
    }
    loadDays(fechasSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cedula]);

  // cuando el usuario cambia la selección en el calendario
  const onChangeDates = (dates) => {
    // en "selectsRange" recibes [start, end]; en "selectMultiple" recibes array
    // Usaremos múltiples fechas manualmente: si dates no es array, lo hacemos array.
    const arr = Array.isArray(dates) ? dates.filter(Boolean) : [dates].filter(Boolean);
    setFechasSel(arr.length ? arr : [new Date()]);
    loadDays(arr.length ? arr : [new Date()]);
  };

  // Render
  return (
    <div style={{ maxWidth: 1100, margin: "30px auto", padding: "0 12px" }}>
      <h2 style={{ margin: "0 0 12px" }}>Calendario de turnos</h2>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 24 }}>
        <div>
          <DatePicker
            inline
            locale="es"
            // OPCIÓN A: seleccionar varias fechas sueltas
            onChange={onChangeDates}
            // react-datepicker no trae "multi-select" nativo estable; este hack permite ctrl/click:
            // usamos 'includeDates' para marcar lo ya elegido y 'onDayClick' para alternar manualmente.
            dayClassName={(d) =>
              fechasSel.map(ymd).includes(ymd(d)) ? "rp-selected" : undefined
            }
            onDayMouseDown={(e) => e.preventDefault()} // evita selección de texto
            onDayClick={(d) => {
              const key = ymd(d);
              const keys = fechasSel.map(ymd);
              if (keys.includes(key)) {
                const filtered = fechasSel.filter((x) => ymd(x) !== key);
                onChangeDates(filtered);
              } else {
                onChangeDates([...fechasSel, d]);
              }
            }}
          />
          {/* mini estilo para marcar seleccionados */}
          <style>
            {`.rp-selected { background:#ffe1c4 !important; border-radius:50%; }`}
          </style>

          {/* Si prefieres SELECCIÓN POR RANGO:
              - cambia el DatePicker por:
                <DatePicker inline locale="es" selectsRange startDate={fechasSel[0]} endDate={fechasSel[1]} onChange={(r)=>{ setFechasSel(r); if(r[0]&&r[1]) loadDays(r); }} />
              - y en loadDays crear un array de días entre start y end.
          */}
        </div>

        <div>
          <div style={{ marginBottom: 8, color: "#555" }}>
            Fechas seleccionadas:{" "}
            <strong>
              {fechasSel.map((d) => d.toLocaleDateString("es-ES")).join(", ")}
            </strong>
          </div>

          {loading && <p>Cargando…</p>}
          {error && <p style={{ color: "crimson" }}>{error}</p>}

          {!loading && !error && fechasSel.map((d) => {
            const key = ymd(d);
            const turnos = turnosPorDia[key] || [];
            return (
              <div key={key} style={{ marginBottom: 18 }}>
                <h3 style={{ margin: "12px 0 8px" }}>
                  {d.toLocaleDateString("es-ES", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                  })}
                </h3>

                {turnos.length === 0 ? (
                  <p>No hay turnos para este día.</p>
                ) : (
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

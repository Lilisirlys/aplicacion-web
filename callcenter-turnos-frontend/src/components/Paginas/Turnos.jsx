// src/components/Paginas/TurnosRango.jsx
import React, { useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("es", es);

// URL base del backend: acepta ambas variables por compatibilidad
const API_BASE =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:3001";

// Normaliza a YYYY-MM-DD corrigiendo zona horaria local
const ymd = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const daysBetween = (start, end) => {
  const out = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    out.push(new Date(d));
  }
  return out;
};

// Límites para el selector (ajústalos si tu BD tiene otras fechas)
const MIN_DATE = new Date("2025-08-01");
const MAX_DATE = new Date("2025-12-31");

export default function TurnosRango() {
  // Identidad del asesor
  const agente = (() => {
    try { return JSON.parse(localStorage.getItem("agente")); } catch { return null; }
  })();
  const cedulaLS = agente?.cedula || localStorage.getItem("cedula") || "";

  // Permito editar la cédula para pruebas si no está en localStorage
  const [cedula, setCedula] = useState(cedulaLS);

  // Rango inicial
  const [rango, setRango] = useState([new Date("2025-09-01"), new Date("2025-09-10")]); // [start, end]
  const [loading, setLoading] = useState(false);
  const [turnos, setTurnos] = useState([]);
  const [error, setError] = useState("");

  const [startDate, endDate] = rango;
  const rangoValido = Boolean(startDate && endDate);

  function pickArray(payload) {
    // Devuelve siempre un array de turnos sin importar el formato del backend
    if (Array.isArray(payload)) return payload;
    if (payload?.data && Array.isArray(payload.data)) return payload.data;
    if (payload?.turnos && Array.isArray(payload.turnos)) return payload.turnos;
    return [];
  }

  async function cargarTurnosRango() {
    try {
      setError("");
      setTurnos([]);

      if (!cedula) {
        setError("No se encontró la cédula del agente. Escríbela en el campo o inicia sesión.");
        return;
      }
      if (!rangoValido) {
        setError("Selecciona un rango de fechas válido.");
        return;
      }

      setLoading(true);

      const desde = ymd(startDate);
      const hasta = ymd(endDate);

      // 1) Intentar endpoint de RANGO
      const urlRango = `${API_BASE}/api/turnos/rango?cedula=${encodeURIComponent(
        cedula
      )}&desde=${desde}&hasta=${hasta}`;

      console.log("[TURNOS] GET:", urlRango);
      const r1 = await fetch(urlRango);
      const j1 = await r1.json().catch(() => ({}));
      console.log("[TURNOS] RESP:", r1.status, j1);

      if (r1.ok) {
        // Si backend usa {ok:false,...}, reviso ok
        if (j1?.ok === false) {
          throw new Error(j1?.detail || j1?.msg || "Error DB");
        }
        setTurnos(pickArray(j1));
        return;
      } else {
        // Si no es ok, intento mostrar detalle del backend
        throw new Error(j1?.detail || j1?.msg || `HTTP ${r1.status}`);
      }
    } catch (e) {
      console.warn("[TURNOS] Error rango:", e?.message || e);
      // 2) Fallback: pedir día a día si la ruta /rango no existe en tu backend
      try {
        const fechas = daysBetween(startDate, endDate).map(ymd);
        const peticiones = fechas.map((f) =>
          fetch(`${API_BASE}/api/turnos/dia?cedula=${encodeURIComponent(cedula)}&fecha=${f}`)
            .then(async (res) => {
              const j = await res.json().catch(() => ({}));
              if (!res.ok || j?.ok === false) return [];
              return pickArray(j);
            })
            .catch(() => [])
        );

        const porDia = await Promise.all(peticiones);
        const combinados = porDia.flat().filter(Boolean);
        setTurnos(combinados);
        if (combinados.length === 0) {
          setError("No se encontraron turnos para el rango seleccionado.");
        }
      } catch (e2) {
        console.error("[TURNOS] Fallback día a día también falló:", e2);
        setError("No se pudieron cargar los turnos. Revisa conexión, puerto del backend y la BD.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Agrupa por fecha para dibujar tabla
  const agrupados = useMemo(() => {
    const g = {};
    for (const t of turnos) {
      const fecha = t.fecha || t.fecha_turno || t.dia || t.date || "—";
      (g[fecha] = g[fecha] || []).push(t);
    }
    return g;
  }, [turnos]);

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 12 }}>Turnos por rango</h2>

      {/* Panel de filtros */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Cédula"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", width: 180 }}
          />

        <DatePicker
          locale="es"
          selectsRange
          startDate={startDate}
          endDate={endDate}
          onChange={(update) => setRango(update)}
          minDate={MIN_DATE}
          maxDate={MAX_DATE}
          dateFormat="yyyy-MM-dd"
          isClearable
          placeholderText="Selecciona rango (desde - hasta)"
          className="date-input"
        />
        </div>

        <button
          onClick={cargarTurnosRango}
          disabled={!rangoValido || loading}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#ff6a00",
            color: "#fff",
            fontWeight: "bold",
            cursor: rangoValido && !loading ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {/* Mensajes */}
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
          Elige un rango y haz clic en <strong>Buscar</strong>.
        </p>
      )}

      {/* Resultados */}
      {Object.keys(agrupados).map((fecha) => (
        <div
          key={fecha}
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
            <strong>{fecha}</strong>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {agrupados[fecha].length} turno(s)
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={th}>Inicio</th>
                  <th style={th}>Fin</th>
                  <th style={th}>Tipo</th>
                  <th style={th}>Observación</th>
                </tr>
              </thead>
              <tbody>
                {agrupados[fecha].map((t, i) => (
                  <tr key={i}>
                    <td style={td}>
                      {t.hora_inicio?.slice?.(0, 5) || t.horaInicio || t.inicio || "—"}
                    </td>
                    <td style={td}>
                      {t.hora_fin?.slice?.(0, 5) || t.horaFin || t.fin || "—"}
                    </td>
                    <td style={td}>{t.tipo || t.estado || "—"}</td>
                    <td style={td}>{t.observacion || t.nota || "—"}</td>
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

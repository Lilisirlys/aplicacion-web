// src/components/Paginas/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Usa el proxy del frontend: package.json -> "proxy": "http://localhost:8013"
const API = ""; // si quieres saltarte el proxy: "http://localhost:8013"

// Normaliza a YYYY-MM-DD (acepta YYYY-MM-DD, dd/mm/aaaa, dd-mm-aaaa)
function toYYYYMMDD(s) {
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return "";
  const d = m[1].padStart(2, "0");
  const M = m[2].padStart(2, "0");
  let Y = m[3];
  if (Y.length === 2) Y = (parseInt(Y, 10) > 50 ? "19" : "20") + Y;
  return `${Y}-${M}-${d}`;
}

export default function Home() {
  const [cedula, setCedula] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Home.jsx cargado. API base =", API || "(proxy)");
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setError("");

    const ced = cedula.trim();
    const fecha = toYYYYMMDD(fechaNacimiento);

    if (!ced || !fecha) {
      setError("Ingresa la cédula y la fecha de nacimiento.");
      return;
    }

    try {
      setLoading(true);

      const resp = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cedula: ced, fecha_nacimiento: fecha }),
      });

      let data = {};
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try { data = await resp.json(); } catch {}
      } else {
        data = { msg: await resp.text() };
      }

      if (!resp.ok || data.ok === false) {
        if (resp.status === 401) throw new Error("Credenciales inválidas");
        if (resp.status === 400) throw new Error(data.msg || "Solicitud inválida");
        if (resp.status === 500) throw new Error("Error del servidor");
        throw new Error(data.msg || `Error (HTTP ${resp.status})`);
      }

      // Guarda datos útiles
      if (data.token) localStorage.setItem("token", data.token);
      if (data.agente) localStorage.setItem("agente", JSON.stringify(data.agente));
      localStorage.setItem("cedula", ced);
      localStorage.setItem("fechaNacimiento", fecha);

      // 👉 Redirige a /turnos (SPA)
      navigate("/turnos"); 
      // Si prefieres recarga completa, usa:
      // window.location.href = "/turnos";
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: "8px" }}>
      <h2>Ingresar</h2>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <label style={{ display: "block", marginBottom: 8 }}>
          Cédula
          <input
            type="text"
            inputMode="numeric"
            value={cedula}
            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 1022345134"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Fecha de nacimiento
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        {error && <p style={{ color: "crimson", marginTop: 6 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: 10, width: "100%", marginTop: 8, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Enviando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

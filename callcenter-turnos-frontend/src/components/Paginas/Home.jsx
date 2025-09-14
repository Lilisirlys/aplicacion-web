// src/components/Paginas/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// URL base del backend (lee .env del FRONT: REACT_APP_API_BASE)
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001";

// Util: normaliza dd/mm/yyyy o dd-mm-yyyy a yyyy-mm-dd
function toYYYYMMDD(s) {
  if (!s) return "";
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str; // ya viene yyyy-mm-dd
  const m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return "";
  const d = m[1].padStart(2, "0");
  const M = m[2].padStart(2, "0");
  let Y = m[3];
  if (Y.length === 2) Y = (parseInt(Y, 10) > 50 ? "19" : "20") + Y;
  return `${Y}-${M}-${d}`;
}

export default function Home() {
  // Prefill útil para pruebas: toma lo que haya en localStorage o deja vacío
  const [cedula, setCedula] = useState(localStorage.getItem("cedula") || "");
  const [fechaNacimiento, setFechaNacimiento] = useState(
    localStorage.getItem("fechaNacimiento") || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Home.jsx cargado. API_BASE =", API_BASE);
    // Si ya hay sesión iniciada, redirige a calendario
    try {
      const ag = localStorage.getItem("agente");
      if (ag) navigate("/calendario");
    } catch {}
  }, [navigate]);

  const fechaNormalizada = toYYYYMMDD(fechaNacimiento);
  const formInvalido = !cedula.trim() || !fechaNormalizada;

  async function onSubmit(e) {
    e.preventDefault();
    if (loading || formInvalido) return;
    setError("");

    const ced = cedula.trim();
    const fecha = fechaNormalizada;

    try {
      setLoading(true);

      const resp = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ cedula: ced, fecha_nacimiento: fecha }),
      });

      // Intenta parsear JSON; si no, cae a texto
      let data;
      try {
        data = await resp.clone().json();
      } catch {
        data = { msg: await resp.text() };
      }

      if (!resp.ok || data.ok === false) {
        if (resp.status === 401) throw new Error("Credenciales inválidas");
        if (resp.status === 400) throw new Error(data.msg || "Solicitud inválida");
        if (resp.status === 500) throw new Error("Error del servidor");
        throw new Error(data.msg || `Error (HTTP ${resp.status})`);
      }

      // Se espera { ok: true, agente, token? }
      if (data.token) localStorage.setItem("token", data.token);
      if (data.agente) localStorage.setItem("agente", JSON.stringify(data.agente));

      localStorage.setItem("cedula", ced);
      localStorage.setItem("fechaNacimiento", fecha);

      // Limpia inputs (opcional)
      // setCedula("");
      // setFechaNacimiento("");

      navigate("/calendario");
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 8 }}>
      <h2>Ingresar</h2>

      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <label style={{ display: "block", marginBottom: 8 }}>
          Cédula
          <input
            type="tel"
            inputMode="numeric"
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value.replace(/\D/g, "")); // solo dígitos
              if (error) setError("");
            }}
            placeholder="Ej: 1000000001"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
            required
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Fecha de nacimiento
          <input
            type="date"
            value={fechaNacimiento}
            onChange={(e) => {
              setFechaNacimiento(e.target.value); // yyyy-mm-dd del date input
              if (error) setError("");
            }}
            // evita fechas futuras
            max={new Date().toISOString().split("T")[0]}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        {error && (
          <p style={{ color: "crimson", marginTop: 6 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || formInvalido}
          style={{
            padding: 10,
            width: "100%",
            marginTop: 8,
            cursor: loading || formInvalido ? "not-allowed" : "pointer",
            background: "#ff6a00",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
          }}
        >
          {loading ? "Enviando..." : "Entrar"}
        </button>

        {/* Ayuda para pruebas (opcional): */}
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
          Recuerda: la BD demo tiene datos entre <b>2025-09-01</b> y <b>2025-12-31</b>.{" "}
          Asegúrate de haber asignado una <b>fecha de nacimiento</b> al agente en la base.
        </p>
      </form>
    </div>
  );
}

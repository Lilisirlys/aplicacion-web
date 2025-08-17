// src/components/Paginas/Home.jsx
import React, { useState, useEffect } from "react";

const API = "http://localhost:5000"; // tu backend

export default function Home() {
  const [cedula, setCedula] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState(""); // <input type="date"> -> YYYY-MM-DD
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("Home.jsx LOADED | API =", API);
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const ced = cedula.trim();
    const fecha = String(fechaNacimiento).slice(0, 10); // asegura YYYY-MM-DD

    if (!ced || !fecha) {
      setError("Ingresa la cédula y la fecha de nacimiento.");
      return;
    }

    try {
      setLoading(true);

      // DEBUG: ver en consola lo que se envía
      console.log("POST", `${API}/api/login`, { cedula: ced, fecha_nacimiento: fecha });

      const resp = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: ced,
          fecha_nacimiento: fecha, // <-- nombre que espera el backend
        }),
      });

      // intenta leer JSON; si no hay JSON, toma texto
      let data = {};
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        try { data = await resp.json(); } catch {}
      } else {
        data.message = await resp.text();
      }

      console.log("RESP", resp.status, data);

      if (!resp.ok || data.ok === false) {
        if (resp.status === 401) throw new Error("Credenciales inválidas");
        if (resp.status === 400) throw new Error(data.message || "Solicitud inválida");
        if (resp.status === 500) throw new Error("Error del servidor");
        throw new Error(data.message || `Error (HTTP ${resp.status})`);
      }

      // Guarda lo que tengas (token opcional, depende de tu API)
      if (data.token) localStorage.setItem("token", data.token);
      localStorage.setItem("cedula", ced);
      localStorage.setItem("fechaNacimiento", fecha);

      // si tu API devuelve agente:
      if (data.agente) localStorage.setItem("agente", JSON.stringify(data.agente));

      // redirige donde necesites
      window.location.href = "/turnos";
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "40px auto" }}>
      <h2>Ingresar</h2>

      {/* IMPORTANTE: sin action; el fetch maneja el envío */}
      <form onSubmit={onSubmit}>
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

        <button type="submit" disabled={loading} style={{ padding: 10, width: "100%", marginTop: 8 }}>
          {loading ? "Enviando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

import React, { useState } from "react";

export default function Home() {
  const [cedula, setCedula] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cedula.trim() || !fechaNacimiento) {
      setError("Ingresa la cédula y la fecha de nacimiento.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("/api/login", {              // ← gracias al proxy
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula: cedula.trim(),
          // el input date ya viene como YYYY-MM-DD
          fechaNacimiento,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || "Error al iniciar sesión");
      }

      const data = await resp.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("cedula", cedula.trim());
      localStorage.setItem("fechaNacimiento", String(fechaNacimiento).slice(0, 10));
      window.location.href = "/turnos";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 380, margin: "40px auto" }}>
      <h2>Ingresar</h2>
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Cédula
          <input
            type="text"
            inputMode="numeric"
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Ej: 1022345134"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
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

        {error && <p style={{ color: "crimson" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: 10, width: "100%" }}>
          {loading ? "Enviando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

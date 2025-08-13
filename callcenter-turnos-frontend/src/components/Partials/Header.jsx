import React from "react";

export default function Header() {
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("cedula");
    localStorage.removeItem("fechaNacimiento");
    window.location.href = "/login";
  }

  return (
    <header style={{ background: "#ff6a00", color: "#fff", padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Jazzplat - Turnos Agentes</strong>
        <button onClick={logout} style={{ border: 0, padding: "6px 10px", cursor: "pointer" }}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

// src/components/Partials/Header.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("cedula");
    localStorage.removeItem("fechaNacimiento");
    window.location.href = "/"; // vuelve al login
  }

  const onCalendar = location.pathname === "/calendario";

  return (
    <header style={{ background: "#ff6a00", color: "#fff", padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong>Jazzplat - Turnos Agentes</strong>
        <div style={{ display: "flex", gap: 8 }}>
          {!onCalendar && (
            <Link to="/calendario">
              <button style={{ border: 0, padding: "6px 10px", cursor: "pointer" }}>
                Calendario
              </button>
            </Link>
          )}
          <button onClick={logout} style={{ border: 0, padding: "6px 10px", cursor: "pointer" }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

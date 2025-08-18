import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Paginas/Home";
import Registro from "./Paginas/Registro"; // tu pantalla que lista turnos

function isAuthenticated() {
  // acepta token o cédula guardada tras el login
  return !!(localStorage.getItem("token") || localStorage.getItem("cedula"));
}

function RutaProtegida({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
}

export default function Direccionamiento() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/turnos"
        element={
          <RutaProtegida>
            <Registro />
          </RutaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Partials/Header";
import Home from "./components/Paginas/Home";
import Turnos from "./components/Paginas/Turnos";
import Calendario from "./components/Paginas/Calendario";

// Componente para proteger rutas privadas
function PrivateRoute({ children }) {
  const cedula = localStorage.getItem("cedula");
  return cedula ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* Página inicial (login) */}
        <Route path="/" element={<Home />} />

        {/* Página de turnos (requiere login) */}
        <Route
          path="/turnos"
          element={
            <PrivateRoute>
              <Turnos />
            </PrivateRoute>
          }
        />

        {/* Página de calendario (requiere login) */}
        <Route
          path="/calendario"
          element={
            <PrivateRoute>
              <Calendario />
            </PrivateRoute>
          }
        />

        {/* Redirección a Home si no existe la ruta */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

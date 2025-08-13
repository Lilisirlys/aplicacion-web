import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./Paginas/Home";
import Registro from "./Paginas/Registro"; // aquí muestras los turnos

function isAuthenticated() {
  return !!localStorage.getItem("token");
}

function RutaProtegida({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export default function Direccionamiento() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Home />} />
        <Route
          path="/turnos"
          element={
            <RutaProtegida>
              <Registro />
            </RutaProtegida>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

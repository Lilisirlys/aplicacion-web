import React, { useState } from 'react';

function Home() {
  const [cedula, setCedula] = useState('');
  const [turnosVisible, setTurnosVisible] = useState(false);

  const handleConsultar = () => {
    if (cedula.trim() === '') {
      alert('Por favor ingresa tu número de cédula.');
      return;
    }
    setTurnosVisible(true);
  };

  const handleVolver = () => {
    setTurnosVisible(false);
    setCedula('');
  };

  return (
    <div className="home">
      {!turnosVisible ? (
        <>
          <h2>Consulta tus turnos</h2>
          <p>Ingresa tu número de cédula para ver tus turnos laborales.</p>
          <div className="botones">
            <input
              type="text"
              className="btn"
              placeholder="Número de cédula"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
            />
            <button className="btn" onClick={handleConsultar}>
              Consultar
            </button>
          </div>
        </>
      ) : (
        <>
          <h2>Turnos del agente</h2>
          <p><strong>Cédula:</strong> {cedula}</p>

          {/* Aquí puede ir el calendario o una lista de turnos */}
          <div className="calendario">
            <p>[ Calendario de turnos simulados aquí 🗓️ ]</p>
          </div>

          <div className="botones">
            <button className="btn" onClick={handleVolver}>
              Volver
            </button>
            <button className="btn">
              Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Home;

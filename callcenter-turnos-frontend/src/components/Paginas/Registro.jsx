import React, { useState } from 'react';

const Registro = () => {
  const [nombre, setNombre] = useState("");

  const manejarRegistro = () => {
    alert(`Agente registrado: ${nombre}`);
    // Aquí podrías hacer un POST a tu API
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Registro de Agente</h2>
      <input
        type="text"
        placeholder="Nombre del agente"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <br /><br />
      <button onClick={manejarRegistro}>Guardar</button>
    </div>
  );
};

export default Registro;

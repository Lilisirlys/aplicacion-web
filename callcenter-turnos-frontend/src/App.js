import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './components/Paginas/Home';
import Registro from './components/Paginas/Registro';
import Header from './components/Partials/Header';
import Footer from './components/Partials/Footer';

function App() {
  return (
    <div>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;


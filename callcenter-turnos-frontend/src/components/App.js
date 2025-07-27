import React from "react";
//react router domnpm star
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Direccionamiento from "./Direccionamiento";
import Header from "./Partials/Header";
import Footer from "./Partials/Footer";


function App(){
    return (
        <Router>
        <div>
            <Header />
            <Direccionamiento />

             <Footer/>
        </div>
        </Router>
    );
}

export default App
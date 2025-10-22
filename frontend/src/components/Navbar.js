import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">UFC Insight</NavLink>
      <div className="navbar-links">
        <NavLink to="/" className="navbar-link">Home</NavLink>
        <NavLink to="/rankings" className="navbar-link">Rankings</NavLink>
        <NavLink to="/korean-fighters" className="navbar-link">Korean Fighters</NavLink>
        <NavLink to="/events" className="navbar-link">Events</NavLink>
      </div>
    </nav>
  );
};

export default Navbar;

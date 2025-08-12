import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <h2>Document AI</h2>
        </Link>
        
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            Upload
          </Link>
          <Link 
            to="/documents" 
            className={location.pathname.startsWith('/documents') ? 'nav-link active' : 'nav-link'}
          >
            Documents
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
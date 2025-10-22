import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import RankingsPage from './pages/RankingsPage';
import KoreanFightersPage from './pages/KoreanFightersPage';
import FighterDetailPage from './pages/FighterDetailPage';
import EventsPage from './pages/EventsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/korean-fighters" element={<KoreanFightersPage />} />
            <Route path="/fighter/:fighterName" element={<FighterDetailPage />} />
            <Route path="/events" element={<EventsPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

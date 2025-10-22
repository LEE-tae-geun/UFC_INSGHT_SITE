import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import FighterCard from "../components/FighterCard";
import "./KoreanFightersPage.css";

const KoreanFightersPage = () => {
  const [fighters, setFighters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFighters = async () => {
      try {
        const response = await fetch("/api/korean-fighters");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setFighters(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFighters();
  }, []);

  const toKebabCase = (str) => {
    return str.toLowerCase().replace(/ /g, "-");
  };

  return (
    <div className="korean-fighters-page">
      <header className="korean-fighters-header">
        <h1>Korean UFC Fighters</h1>
        <p>A showcase of talented fighters from South Korea.</p>
      </header>
      <main className="korean-fighters-container">
        {loading && <p className="loading-message">Loading fighters...</p>}
        {error && (
          <p className="error-message">Error fetching fighters: {error}</p>
        )}
        {!loading && !error && (
          <div className="fighters-grid">
            {fighters.map((fighter, index) => (
              <Link
                key={fighter.id || index}
                to={`/fighter/${toKebabCase(fighter.name)}`}
              >
                <FighterCard fighter={fighter} />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default KoreanFightersPage;

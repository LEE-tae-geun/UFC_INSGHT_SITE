import React, { useState, useEffect } from 'react';
import ChampionProfile from '../components/ChampionProfile';
import FighterRow from '../components/FighterRow';
import './RankingsPage.css';

const RankingsPage = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/rankings');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setRankings(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  return (
    <div className="rankings-page">
      <header className="rankings-header">
        <h1>UFC Rankings</h1>
      </header>
      <main className="rankings-container">
        {loading && <p className="loading-message">Loading rankings...</p>}
        {error && <p className="error-message">Error fetching rankings: {error}</p>}
        {!loading && !error && (
          <div className="rankings-grid">
            {rankings.map((category, index) => {
              const isP4P = category.category.includes("Pound-for-Pound");
              const champion = !isP4P ? category.fighters.find(f => f.rank === "Champion") : null;
              const rankers = !isP4P ? category.fighters.filter(f => f.rank !== "Champion") : category.fighters;

              return (
                <div key={index} className="weight-class-section">
                  <h2 className="weight-class-title">{category.category}</h2>
                  {champion && <ChampionProfile champion={champion} />}
                  <div className="fighters-list">
                    {rankers.map((fighter, fighterIndex) => (
                      <FighterRow key={fighterIndex} fighter={fighter} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RankingsPage;
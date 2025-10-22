import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import "./FighterDetailPage.css";

const FighterDetailPage = () => {
  const { fighterName } = useParams();
  const [fighterDetails, setFighterDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFighterDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/fighter/${encodeURIComponent(fighterName)}`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setFighterDetails(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFighterDetails();
  }, [fighterName]);

  if (loading) {
    return <p className="loading-message">Loading fighter details...</p>;
  }

  if (error) {
    return <p className="error-message">Error fetching details: {error}</p>;
  }

  if (!fighterDetails) {
    return <p>No fighter details found.</p>;
  }

  const { name, nickname, image, record, weightClass, stats, fightHistory } =
    fighterDetails;

  return (
    <div className="fighter-detail-page">
      <header
        className="detail-header"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="detail-header-overlay">
          <div className="detail-header-content">
            <h1 className="detail-name">{name}</h1>
            <h2 className="detail-nickname">"{nickname}"</h2>
            <div className="detail-record">{record}</div>
            <div className="detail-weight-class">{weightClass}</div>
          </div>
        </div>
      </header>

      <main className="detail-main-content">
        <section className="stats-section">
          <h3>Career Statistics</h3>
          <div className="stats-grid">
            {stats &&
              Object.entries(stats).map(([key, value]) => (
                <div key={key} className="stat-item">
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{key.replace(/_/g, " ")}</div>
                </div>
              ))}
          </div>
        </section>

        <section className="history-section">
          <h3>Fight History</h3>
          <table className="history-table">
            <thead>
              <tr>
                <th>Result</th>
                <th>Opponent</th>
                <th>Event</th>
                <th>Method</th>
                <th>Round</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {fightHistory &&
                fightHistory.map((fight, index) => (
                  <tr
                    key={index}
                    className={`result-${fight.result.toLowerCase()}`}
                  >
                    <td className="fight-result">{fight.result}</td>
                    <td>{fight.opponent}</td>
                    <td>{fight.event}</td>
                    <td>{fight.method}</td>
                    <td>{fight.round}</td>
                    <td>{fight.time}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default FighterDetailPage;

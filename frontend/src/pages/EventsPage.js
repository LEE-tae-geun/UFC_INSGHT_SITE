import React, { useState, useEffect } from "react";
import "./EventsPage.css";

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div className="events-page">
      <header className="events-header">
        <h1>Upcoming UFC Events</h1>
        <p>Stay up-to-date with the latest fight cards and events.</p>
      </header>
      <main className="events-container">
        {loading && <p className="loading-message">Loading events...</p>}
        {error && <p className="error-message">Error fetching events: {error}</p>}
        {!loading && !error && (
          <div className="events-grid">
            {events.map((event, index) => (
              <div key={index} className="event-card">
                <div className="event-card-header">
                  <h2 className="event-title">{event.title}</h2>
                  <p className="event-date">{event.date}</p>
                </div>
                <div className="event-card-body">
                  <p className="event-location"><strong>Location:</strong> {event.location}</p>
                  <p className="event-main-event"><strong>Main Event:</strong> {event.mainEvent}</p>
                  <p className="event-watch"><strong>How to Watch:</strong> Not available</p>
                </div>
                <div className="event-card-footer">
                  <a href={event.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    Event Page
                  </a>
                  {event.ticketLink && (
                    <a href={event.ticketLink} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                      Buy Tickets
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EventsPage;

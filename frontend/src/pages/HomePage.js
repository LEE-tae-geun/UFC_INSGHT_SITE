import React, { useState, useEffect } from 'react';
import NewsCard from '../components/NewsCard';
import './HomePage.css'; // We will create this CSS file next

const HomePage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/news');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setNews(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="home-page">
      <header className="home-header">
        <h1>UFC Insight</h1>
        <p>Latest News from UFC.com</p>
      </header>
      <main className="news-container">
        {loading && <p>Loading news...</p>}
        {error && <p>Error fetching news: {error}</p>}
        {!loading && !error && (
          <div className="news-grid">
            {news.map((article, index) => (
              <NewsCard key={index} article={article} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;

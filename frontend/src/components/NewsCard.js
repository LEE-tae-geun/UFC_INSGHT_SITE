import React from 'react';
import './NewsCard.css';

const NewsCard = ({ article }) => {
  // If no article is provided, render nothing.
  if (!article) {
    return null;
  }

  const { link, image, title, summary, date } = article;

  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="news-card">
      <div className="news-card__image-container">
        <img src={image} alt={title} className="news-card__image" />
      </div>
      <div className="news-card__content">
        <h3 className="news-card__title">{title}</h3>
        <p className="news-card__summary">{summary}</p>
        <span className="news-card__date">{date}</span>
      </div>
    </a>
  );
};

export default NewsCard;

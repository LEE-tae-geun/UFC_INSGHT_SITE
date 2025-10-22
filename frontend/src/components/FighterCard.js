import React from 'react';
import './FighterCard.css';

const FighterCard = ({ fighter }) => {
  if (!fighter) {
    return null;
  }

  const { name, rank, image, link } = fighter;

  // Use a placeholder image if the scraped image is missing
  const placeholderImage = 'https://via.placeholder.com/150';
  const displayImage = image || placeholderImage;

  const cardContent = (
    <div className="fighter-card__image-container">
      <img src={displayImage} alt={name} className="fighter-card__image" />
      <div className="fighter-card__info">
        {rank && <span className="fighter-card__rank">{rank}</span>}
        <h4 className="fighter-card__name">{name}</h4>
      </div>
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="fighter-card">
        {cardContent}
      </a>
    );
  }

  return <div className="fighter-card">{cardContent}</div>;
};

export default FighterCard;

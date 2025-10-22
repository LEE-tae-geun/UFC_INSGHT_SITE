import React from 'react';
import { Link } from 'react-router-dom';
import './FighterRow.css';

const FighterRow = ({ fighter }) => {
  if (!fighter) {
    return null;
  }

  const { name, rank, image, link } = fighter;
  const fighterUrlName = link ? link.split('/').pop() : '';

  // Use a placeholder for missing images
  const placeholderImage = 'https://via.placeholder.com/80';
  const displayImage = image || placeholderImage;

  return (
    <Link to={`/fighter/${fighterUrlName}`} className="fighter-row">
      <div className="fighter-rank">{rank}</div>
      <div className="fighter-row-image-container">
        <img src={displayImage} alt={name} className="fighter-row-image" />
      </div>
      <div className="fighter-row-name">{name}</div>
    </Link>
  );
};

export default FighterRow;
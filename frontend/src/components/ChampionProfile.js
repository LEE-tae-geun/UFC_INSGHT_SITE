import React from 'react';
import { Link } from 'react-router-dom';
import './ChampionProfile.css';

const ChampionProfile = ({ champion }) => {
  if (!champion) {
    return null;
  }

  const { name, link, image } = champion;
  const fighterUrlName = link.split('/').pop();

  return (
    <Link to={`/fighter/${fighterUrlName}`} className="champion-profile">
      <div className="champion-image-container">
        <img src={image} alt={name} className="champion-image" />
      </div>
      <div className="champion-info">
        <h3 className="champion-name">{name}</h3>
        <span className="champion-title">Champion</span>
      </div>
    </Link>
  );
};

export default ChampionProfile;
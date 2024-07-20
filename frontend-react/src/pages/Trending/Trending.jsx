// src/pages/Trending/Trending.jsx
import React from 'react';
import { Link } from 'react-router-dom';

import './Trending.css';

const Trending = () => {
    return (
        <div className="trending">
        <div className="container">
            <div className="trending__content">
            <h1 className="trending__title">Trending</h1>
            <p className="trending__text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam nec magna sit amet sem ultricies tincidunt. Integer auctor, tur</p>

            <Link to="/subscribe" className="trending__button">Subscribe</Link>
            </div>
        </div>
        </div>
    );
    }

export default Trending;
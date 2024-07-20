// src/pages/Home/Home.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header/Header';

import './Home.css';

const Home = () => {
    return (
        <div className="home">
        {/* <Header /> */}
        <div className="container">
            <div className="home__content">
            <h1 className="home__title">Welcome to our website</h1>
            <p className="home__text">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam nec magna sit amet sem ultricies tincidunt. Integer auctor, tur</p>
            <Link to="/subscribe" className="home__button">Subscribe</Link>
            </div>
        </div>
        </div>
    );
    }

export default Home;

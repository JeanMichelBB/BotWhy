// src/components/Header/Header.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Header.css';
import Login from '../Login/Login';
import Logout from '../Logout/Logout';
import { gapi } from 'gapi-script';

const clientId = '';

const Header = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profile, setProfile] = useState({ name: '', imageUrl: '' });
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);

  useEffect(() => {
    function start() {
      gapi.load('auth2', () => {
        const auth2 = gapi.auth2.init({
          client_id: clientId,
          scope: 'profile',
        });

        auth2.then(() => {
          const authInstance = gapi.auth2.getAuthInstance();
          const isSignedIn = authInstance.isSignedIn.get();
          setIsSignedIn(isSignedIn);

          if (isSignedIn) {
            const user = authInstance.currentUser.get();
            const profile = user.getBasicProfile();
            setProfile({
              name: profile.getName(),
              imageUrl: profile.getImageUrl(),
            });
          } else {
            setProfile({ name: '', imageUrl: '' });
          }

          authInstance.isSignedIn.listen((isSignedIn) => {
            setIsSignedIn(isSignedIn);
            setIsOverlayVisible(false); // Hide overlay on sign-in status change

            if (isSignedIn) {
              const user = authInstance.currentUser.get();
              const profile = user.getBasicProfile();
              setProfile({
                name: profile.getName(),
                imageUrl: profile.getImageUrl(),
              });
            } else {
              setProfile({ name: '', imageUrl: '' });
            }
          });
        }).catch((err) => console.error('Error initializing Google Auth:', err));
      });
    }

    start();
  }, []);

  const toggleOverlay = () => {
    setIsOverlayVisible(!isOverlayVisible);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header__content">
          <div className="header__logo">
            <Link to="/" className="header__logo-link">
              <span>ChatBox</span>
            </Link>
          </div>
          <div className="header__nav">
            {isSignedIn ? (
              <div className="profile">
                <img 
                  src={profile.imageUrl} 
                  alt="profile" 
                  className="profile__image" 
                  onClick={toggleOverlay}
                />
                {isOverlayVisible && (
                  <div className="profile__overlay">
                    <span className="profile__name">{profile.name}</span>
                    <Logout setIsSignedIn={setIsSignedIn} />
                  </div>
                )}
              </div>
            ) : (
              <Login />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
// src/components/Logout/Logout.jsx
import React from 'react';
import { GoogleLogout } from 'react-google-login';

const Logout = ({ setIsSignedIn = () => {} }) => {
  const clientId = '';

  const onSuccess = () => {
    console.log('Logout made successfully');
    setIsSignedIn(false); // Call the default function to update the signed-in state
  };

  return (
    <div id="logout">
      <GoogleLogout
        clientId={clientId}
        buttonText="Logout with Google"
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default Logout;
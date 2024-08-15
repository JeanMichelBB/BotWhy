// src/components/Logout/Logout.jsx
import React from 'react';
import { GoogleLogout } from 'react-google-login';

const Logout = ({ setIsSignedIn = () => {} }) => {
  const clientId = '';

  const onSuccess = () => {
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
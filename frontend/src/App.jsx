// src/App.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "./Contexts/AuthContext";
import LandingPage from "./Components/LandingPage/LandingPage";
import LoginSignup from "./Components/LoginSignup/LoginSignup";
import ContactsPage from "./Components/ContactsPage/ContactsPage";

function App() {
  const { token } = useContext(AuthContext);
  const [showAuth, setShowAuth] = useState(false);

  if (token) {
    return <ContactsPage />;
  }

  if (!showAuth) {
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  return <LoginSignup onBackToLanding={() => setShowAuth(false)} />;
}

export default App;

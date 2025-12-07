// src/Components/LandingPage/LandingPage.jsx
import React from "react";
import "./LandingPage.css";

const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="landing-root">
      <div className="landing-card">
        <h1 className="landing-title">Swicall</h1>
        <p className="landing-subtitle">
          A lifeline contact manager that keeps your important numbers safe and
          reachable from any device – even when your phone is lost, dead, or
          unavailable.
        </p>

        <h2 className="landing-section-title">How Swicall Helps You</h2>
        <p className="landing-text">
          • Securely store your contacts with encryption <br />
          • Access them from any browser using your login <br />
          • Quickly copy numbers during emergencies <br />• On your primary
          device, you can add, update, delete and sync contacts
        </p>

        <h2 className="landing-section-title">Privacy Policy</h2>
        <p className="landing-text" id="privacy">
          Swicall stores your contact numbers in encrypted form and uses them
          solely to display and manage your contact list inside this
          application. We do not use your contact information for advertising or
          profiling. You can delete your account and associated contacts at any
          time by contacting the application owner or using in-app options (if
          available).
        </p>

        <h2 className="landing-section-title">Terms &amp; Conditions</h2>
        <p className="landing-text" id="terms">
          By using Swicall you authorize the app to process and store your
          contact information for the purpose of managing it securely. You agree
          not to use the application for any unlawful activity and understand
          that access may depend on third-party services (such as Google APIs
          for contact sync). Continued use of the app implies acceptance of
          these terms and the privacy policy.
        </p>

        <h3 className="landing-getstarted">Ready to get started?</h3>
        <div className="landing-buttons">
          <button className="btn-primary" onClick={onGetStarted}>
            Login / Signup to Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

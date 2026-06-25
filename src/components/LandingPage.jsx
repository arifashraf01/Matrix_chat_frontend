import React from "react";
import "./LandingPage.css";

export default function LandingPage({ onNavigate, client }) {
  const isLoggedIn = !!client;

  const handleGetStartedClick = () => {
    onNavigate("/auth");
  };

  return (
    <div className="landing-container">
      {/* Decorative Blobs */}
      <div className="landing-blobs">
        <div className="landing-blob landing-blob--1" />
        <div className="landing-blob landing-blob--2" />
      </div>

      {/* Header */}
      <header className="landing-header">
        <a href="/" className="landing-logo" onClick={(e) => { e.preventDefault(); onNavigate("/"); }}>
          {/* Modern Matrix-inspired SVG Logo */}
          <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Left Matrix Bracket */}
            <path
              d="M14 8H6V40H14"
              stroke="#5b4bff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right Matrix Bracket */}
            <path
              d="M34 8H42V40H34"
              stroke="#5b4bff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Stylized Modern M / Chat Symbol inside */}
            <path
              d="M18 18L24 24L30 18V30H18V18Z"
              fill="#10b981"
              stroke="#10b981"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          </svg>
          <span>Matrix Chat</span>
        </a>

        <button className="landing-nav-btn" onClick={handleGetStartedClick}>
          {isLoggedIn ? "Go to Chat" : "Login"}
        </button>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            <span>Open Source Messaging</span>
          </div>

          <h1>
            Arif Ashraf <br />
            <span>Matrix Chat</span>
          </h1>

          <p>
            A modern real-time messaging platform powered by Matrix. Connect seamlessly, chat securely, and collaborate effortlessly.
          </p>

          <button className="landing-cta-btn" onClick={handleGetStartedClick}>
            <span>{isLoggedIn ? "Open Your Chat" : "Get Started"}</span>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </section>

        {/* Features Section */}
        <section className="landing-features-section">
          <div className="landing-section-title">
            <h2>Modern Features, Powered by Matrix</h2>
            <p>Everything you expect from a premium messenger, engineered with open protocols.</p>
          </div>

          <div className="landing-features-grid">
            {/* Feature 1 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Real-time messaging</h3>
                <p>Send and receive messages instantly with sub-second latency over decentralized servers.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Typing indicators</h3>
                <p>Know exactly when your friends are typing with clean, fluid, real-time typing state updates.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Read receipts</h3>
                <p>Track delivery and view status of your messages so you never guess if they've been seen.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Direct messaging</h3>
                <p>Start fast, private one-to-one chats with any Matrix user in seconds.</p>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Dark mode</h3>
                <p>Easy on the eyes day or night. Seamlessly toggle themes in the application settings.</p>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Presence status</h3>
                <p>See who is online, idle, offline, or active with detailed real-time presence indicators.</p>
              </div>
            </div>

            {/* Extra Feature 7 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Media Uploads</h3>
                <p>Share high-resolution images and attachments with full in-app preview capability.</p>
              </div>
            </div>

            {/* Extra Feature 8 */}
            <div className="landing-feature-card">
              <div className="landing-feature-icon">✓</div>
              <div className="landing-feature-content">
                <h3>Persistent Sessions</h3>
                <p>Automatically restore your active sessions safely from local storage on launch.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Arif Ashraf. Powered by the Matrix protocol.</p>
        <div className="landing-footer-links">
          <a href="https://matrix.org" target="_blank" rel="noopener noreferrer">About Matrix</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate("/"); }}>Privacy Policy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate("/"); }}>Terms of Service</a>
        </div>
      </footer>
    </div>
  );
}

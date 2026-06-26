import { useState } from "react";
import "./SignupPage.css";
import { registerWithPassword, createMatrixClient } from "../services/matrixClient";
import AuthLayout from "./AuthLayout";

const DEFAULT_HOMESERVER_URL = "https://matrix.org";

/** Static marketing content for the Sign Up left panel */
const SIGN_UP_FEATURES = [
  {
    icon: "🌐",
    title: "Decentralized",
    description: "Connect to any Matrix homeserver — no single point of failure.",
  },
  {
    icon: "⚡",
    title: "Real-Time",
    description: "Sub-second message delivery across federated servers.",
  },
  {
    icon: "🖼️",
    title: "Media Sharing",
    description: "Share images and files with full in-app previews.",
  },
  {
    icon: "🌙",
    title: "Dark Mode",
    description: "Seamlessly switch themes to match your preference.",
  },
  {
    icon: "🔄",
    title: "Session Restore",
    description: "Auto-resume safely from local storage on every visit.",
  },
];

export default function SignupPage({ onNavigate, onRegister, addToast }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [homeserverUrl, setHomeserverUrl] = useState(DEFAULT_HOMESERVER_URL);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [successMessage, setSuccessMessage] = useState("");

  // ── Handlers (unchanged) ───────────────────────────────────────────────────
  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");

    if (!homeserverUrl || !username || !password || !confirmPassword) {
      setError("All fields are required.");
      addToast("error", "All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      addToast("error", "Passwords do not match.");
      return;
    }

    // Validate username doesn't contain spaces
    if (username.includes(" ")) {
      setError("Username cannot contain spaces.");
      addToast("error", "Username cannot contain spaces.");
      return;
    }

    setStatus("registering");
    try {
      // Create a client with the provided homeserver URL
      const client = createMatrixClient({ baseUrl: homeserverUrl });

      // Register the user
      await registerWithPassword(client, { username, password, homeserverUrl });

      addToast("success", "Account created successfully. Please sign in.");
      onNavigate(`/auth?username=${username}`); // Pre-fill username
    } catch (err) {
      setError(err.message || "Registration failed.");
      addToast("error", err.message || "Registration failed.");
      setStatus("idle");
    }
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    onNavigate("/auth/login");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      heading={<>Chat Without <span>Limits.</span></>}
      subheading="Join the Matrix network — open, decentralized, and always in your control."
      features={SIGN_UP_FEATURES}
    >
      <p className="auth-eyebrow">Matrix Chat</p>
      <h2 className="auth-form-title">Create your account</h2>
      <p className="auth-form-copy">
        Create a Matrix account and start chatting instantly.
      </p>

      <form className="signup-form" onSubmit={handleSignup}>
        <label className="field">
          <span>Homeserver URL</span>
          <input
            value={homeserverUrl}
            onChange={(e) => setHomeserverUrl(e.target.value)}
            type="text"
            autoComplete="off"
            placeholder="https://matrix.org"
          />
        </label>

        <label className="field">
          <span>Username</span>
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            autoComplete="username"
            placeholder="@user:matrix.org"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <div className="password-input-wrapper">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <label className="field">
          <span>Confirm Password</span>
          <div className="password-input-wrapper">
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm Password"
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {(error || successMessage) ? (
          <div className="alert-box">
            {error ? <p className="form-error">{error}</p> : null}
            {successMessage ? <p className="form-success">{successMessage}</p> : null}
          </div>
        ) : null}

        <button className="primary-button" type="submit" disabled={status === "registering"}>
          {status === "registering" ? (
            <>Creating Account…<span className="spinner" aria-hidden="true" /></>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="auth-footer-text">
        Already have an account?{" "}
        <a href="/auth/login" onClick={handleSignInClick}>Sign In</a>
      </p>
    </AuthLayout>
  );
}

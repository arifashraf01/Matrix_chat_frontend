import { useState } from "react";
import "./SignupPage.css";
import { registerWithPassword, createMatrixClient } from "../services/matrixClient";

const DEFAULT_HOMESERVER_URL = "https://matrix.org";

export default function SignupPage({ onNavigate, onRegister, addToast }) {
  const [homeserverUrl, setHomeserverUrl] = useState(DEFAULT_HOMESERVER_URL);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [successMessage, setSuccessMessage] = useState("");

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

  return (
    <main className="signup-shell">
      <section className="signup-left">
        <div className="signup-card">
          <p className="eyebrow">Matrix Chat</p>
          <h1>Create your account</h1>
          <p className="signup-card__copy">
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
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="Password"
              />
            </label>

            <label className="field">
              <span>Confirm Password</span>
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                placeholder="Confirm Password"
              />
            </label>

            {error || successMessage ? (
              <div className="alert-box">
                {error ? <p className="form-error">{error}</p> : null}
                {successMessage ? <p className="form-success">{successMessage}</p> : null}
              </div>
            ) : null}

            <button className="primary-button" type="submit" disabled={status === "registering"}>
              {status === "registering" ? (
                <>
                  Creating Account...
                  <span className="spinner" aria-hidden="true" />
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="signup-footer-text">
            Already have an account?{" "}
            <a href="/auth/login" onClick={handleSignInClick}>
              Sign In
            </a>
          </p>
        </div>
      </section>

      <section className="signup-right">
        <div className="signup-right-content">
          <h1>Welcome to Arif Ashraf Matrix Chat</h1>
          <p>A modern Matrix messaging client featuring:</p>
          <ul>
            <li>✓ Real-time messaging</li>
            <li>✓ Typing indicators</li>
            <li>✓ Read receipts</li>
            <li>✓ Presence</li>
            <li>✓ Direct messaging</li>
            <li>✓ Dark mode</li>
          </ul>
        </div>
        {/* Decorative Blobs */}
        <div className="signup-blobs">
          <div className="signup-blob signup-blob--1" />
          <div className="signup-blob signup-blob--2" />
        </div>
      </section>
    </main>
  );
}

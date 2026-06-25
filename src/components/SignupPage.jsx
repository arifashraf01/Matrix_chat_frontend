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

import "./AuthLayout.css";

/**
 * The Matrix Chat SVG logo — identical to the one used on the Landing Page
 * so the brand stays consistent across the entire entry flow.
 */
const MatrixLogo = () => (
  <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Left bracket */}
    <path d="M14 8H6V40H14" stroke="#5b4bff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Right bracket */}
    <path d="M34 8H42V40H34" stroke="#5b4bff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    {/* Inner M / chat shape */}
    <path d="M18 18L24 24L30 18V30H18V18Z" fill="#10b981" stroke="#10b981" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);

/**
 * AuthLayout
 *
 * A shared two-column shell used by both the Sign In and Sign Up pages.
 *
 * Props:
 *  - heading    {ReactNode} — main marketing headline rendered as <h1>
 *  - subheading {string}    — short paragraph below the heading
 *  - features   {Array<{ icon: string, title: string, description: string }>}
 *  - children   {ReactNode} — the auth form card content
 */
export default function AuthLayout({ heading, subheading, features, children }) {
  return (
    <main className="auth-shell">

      {/* ── Left: marketing panel ── */}
      <section className="auth-left" aria-label="Product overview">
        {/* Decorative background blobs */}
        <div className="auth-left__blobs" aria-hidden="true">
          <div className="auth-blob auth-blob--1" />
          <div className="auth-blob auth-blob--2" />
          <div className="auth-blob auth-blob--3" />
        </div>

        <div className="auth-marketing">
          {/* Brand logo */}
          <a href="/" className="auth-logo" aria-label="Matrix Chat home">
            <MatrixLogo />
            <span>Matrix Chat</span>
          </a>

          {/* Marketing copy */}
          <div className="auth-marketing__body">
            <p className="auth-marketing__eyebrow">Decentralized Messaging</p>
            <h1 className="auth-marketing__heading">{heading}</h1>
            <p className="auth-marketing__sub">{subheading}</p>

            {/* Feature cards */}
            <ul className="auth-features" role="list">
              {features.map((feature) => (
                <li key={feature.title} className="auth-feature-card">
                  <span className="auth-feature-icon" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <div className="auth-feature-text">
                    <strong>{feature.title}</strong>
                    <span>{feature.description}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Right: form panel ── */}
      <section className="auth-right" aria-label="Authentication form">
        <div className="auth-form-card">
          {children}
        </div>
      </section>

    </main>
  );
}

import Link from 'next/link';
import './landing.css';

export default function HomePage() {
  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">BF</div>
            <span className="landing-logo-text">BookFlow<span className="landing-logo-ai">AI</span></span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <Link href="/login" className="btn btn-primary btn-sm">
              Admin Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            AI-Powered Voice Agent
          </div>
          <h1 className="hero-title">
            Your AI Receptionist<br />
            <span className="hero-gradient">Never Misses a Call</span>
          </h1>
          <p className="hero-subtitle">
            BookFlow AI answers your phone, books appointments, manages schedules, and
            sends confirmations — all with natural human-like conversation. Zero missed calls.
            Zero hiring.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="btn btn-primary btn-lg">
              Get Started Free
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">99.2%</div>
              <div className="hero-stat-label">Call Answer Rate</div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-value">&lt;2s</div>
              <div className="hero-stat-label">Response Time</div>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat">
              <div className="hero-stat-value">24/7</div>
              <div className="hero-stat-label">Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything You Need to<br />Automate Bookings</h2>
          </div>
          <div className="features-grid">
            {[
              {
                icon: '🤖',
                title: 'AI Voice Agent',
                description: 'Natural phone conversations that book, reschedule, and confirm appointments automatically.',
              },
              {
                icon: '📱',
                title: 'Mobile App',
                description: 'Staff and admins get real-time notifications, calendar views, and availability management.',
              },
              {
                icon: '📊',
                title: 'Smart Dashboard',
                description: 'Full admin control — services, staff, schedules, revenue analytics, and AI call logs.',
              },
              {
                icon: '🔔',
                title: 'Push Notifications',
                description: 'Instant alerts for new bookings, cancellations, reminders, and escalations.',
              },
              {
                icon: '🌐',
                title: 'Online Booking',
                description: 'Public booking page for each business — clients can self-book from any device.',
              },
              {
                icon: '🔒',
                title: 'Enterprise Security',
                description: 'Row-level data isolation, encrypted PII, HMAC webhook validation, and JWT auth.',
              },
            ].map((feature, i) => (
              <div className="feature-card" key={i}>
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2 className="section-title">From Phone Call to Confirmed Booking<br />in Under 60 Seconds</h2>
          </div>
          <div className="steps">
            {[
              { step: '01', title: 'Customer Calls', desc: 'They dial your business number. BookFlow AI picks up instantly.' },
              { step: '02', title: 'AI Understands', desc: 'Speech-to-text + LLM brain processes the request in real-time.' },
              { step: '03', title: 'Checks Availability', desc: 'Live staff schedules and existing bookings are queried instantly.' },
              { step: '04', title: 'Books & Confirms', desc: 'Appointment is created, notifications sent, caller gets confirmation.' },
            ].map((s, i) => (
              <div className="step-item" key={i}>
                <div className="step-number">{s.step}</div>
                <div className="step-content">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="section-inner">
          <h2>Ready to Never Miss a Call Again?</h2>
          <p>Start with the free testing stack — Groq + Hugging Face. Zero cost.</p>
          <Link href="/login" className="btn btn-primary btn-lg">
            Start Building Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-logo">
            <div className="landing-logo-icon">BF</div>
            <span className="landing-logo-text">BookFlow<span className="landing-logo-ai">AI</span></span>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
            © 2025 BookFlow AI. AI-Powered Appointment Scheduling.
          </p>
        </div>
      </footer>
    </div>
  );
}

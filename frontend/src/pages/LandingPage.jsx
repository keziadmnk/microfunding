import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 },
    )

    const revealItems = document.querySelectorAll('[data-reveal]')
    revealItems.forEach((item) => observer.observe(item))

    return () => observer.disconnect()
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="top-nav" aria-label="Main navigation">
        <div className="container nav-inner">
          <div className="nav-left">
            <a className="brand" href="#home">
              MicroFun
            </a>
            <nav className="desktop-nav" aria-label="Primary">
              <a className="active" href="#funding">
                Funding
              </a>
              <a href="#mentorship">Mentorship</a>
              <a href="#forum">Forum</a>
              <a href="#about">About</a>
            </nav>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="text-btn">
              Login
            </Link>
            <Link to="/register" className="solid-btn compact">
              Register
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="hero-section" id="home">
          <div className="container hero-grid">
            <div className="hero-copy" data-reveal>
              <div className="pill">
                <span className="material-symbols-outlined" aria-hidden="true">
                  verified
                </span>
                <span>Connecting 10,000+ Diaspora Mentors</span>
              </div>
              <h1>Empowering Indonesian MSMEs through AI and Global Diaspora</h1>
              <p>
                Bridge the funding gap and scale your business with professional
                mentorship from the global Indonesian network and cutting-edge AI
                insights.
              </p>
              <div className="hero-actions">
                <button type="button" className="solid-btn">
                  Join as MSME
                  <span className="material-symbols-outlined" aria-hidden="true">
                    trending_up
                  </span>
                </button>
                <button type="button" className="outline-btn">
                  Support as Diaspora
                  <span className="material-symbols-outlined" aria-hidden="true">
                    public
                  </span>
                </button>
              </div>
            </div>

            <div className="hero-visual" data-reveal>
              <div className="photo-frame">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8mqONSDkBfg_mme-J6RzMkRxHD4QHbFJshqgQ4eAtYRJjFrKbGhshh0GvyngMLLcEZuOIcWEICDPXniSsJhWUNOsBWbfLQ2FuU4WC2mZ2XXOgrapSApGERr-iEdgHQFUabKFKxEr6sqhmcrI3zn43P2ctVeyc_JbJRzMyWZfrLXncJlwFPHWI5izxwe7ZUhhhIUT7I1NrUjASyS4O0LLZkPnnRPaUnmO5Ebp47mEalhoKy3mq9QXM4-SsYFB6tWogzFfKFbmNoV4"
                  alt="Indonesian MSME owner smiling while working in a shop"
                />
              </div>
              <article className="floating-stat" aria-label="Funding progress">
                <div className="icon-round">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    payments
                  </span>
                </div>
                <div>
                  <p>Funding Goal</p>
                  <strong>92% Reached</strong>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section section-white" id="about">
          <div className="container" data-reveal>
            <div className="section-head centered">
              <h2>The Critical Opportunity Gap</h2>
              <p>
                Indonesia&apos;s economic backbone is underfunded. We bridge the
                distance between untapped potential and global resources.
              </p>
            </div>

            <div className="bento-grid">
              <article className="card large-card">
                <h3>60% GDP Contribution</h3>
                <p>
                  MSMEs drive the nation, yet they face a massive credit growth
                  decline. Traditional banking often overlooks the small-scale
                  brilliance of local entrepreneurs.
                </p>
                <div className="progress-wrap" aria-label="GDP impact meter">
                  <div className="progress-track">
                    <span className="progress-fill" style={{ width: '60%' }} />
                  </div>
                  <p className="progress-label">GDP IMPACT: 60%</p>
                </div>
              </article>

              <article className="card dark-card">
                <span className="material-symbols-outlined big-icon" aria-hidden="true">
                  public
                </span>
                <h3>8M+ Diaspora Network</h3>
                <p>
                  The Indonesian global network holds trillions in investment
                  potential and decades of professional expertise that remains
                  largely untapped.
                </p>
                <div className="avatar-row" aria-hidden="true">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIifW-TnSNuPseeFAGl9vok3m1ZFR2iO53Bm-jvAjMAt5BJp7RuZWqrHoy8bXskHqZfvpw_3y9NlRTuEcZkKd5tZv8gt-sISv_1oyvMahGAZymCOvG4AU4IGd7CmW5MAQL4GUI_B_pJsa1ftleHiKjH89IU7JkIegRWo9XyAhf-hQ9q2C7lbavqovsWhNjafthQulM0v-3JpEBA7ntAm4BIIxBbCLJYMXsibn3MD2OB8M115uDtnDcgsb51Y_I0a9fO6wqxTH0p34"
                    alt=""
                  />
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTNRnDhotc34tSaqYpYQf-vSR-3crAlKcYkQPf3KKaqNtyZ10GOjy43QV7pekMYzEw0damyiQcHxF6Q440oFdbZEYK6qw6vTHw2AwOT4rOFv3NfWufMXJqxIUh7V4gGozgoRx6c8TTluwLYJlst_f27OOzFzNkW-hysOtYCeQZDkHMQSgosT5tku_Ya8F9v7G4iEv0NL40V5U8IVr_qgQlRPwceyCEp5Gq_AsgG0lLKfcbFpzvg3b_TvzsNLqeQoqCHzEfOpVPsVs"
                    alt=""
                  />
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCbr1R0kVPjcqZivywxc7DQQVxXIw2_Z8wOuHzSTbXEtsWbqBvZnCS5CStJ6n0oZXwFYbq5K_LVGn2rGesKS5FEZlf1BZnsAJgztKTrtJzK4Gt4vizYCETy0fYhEvSi9suIppfAWkTMIL1SkTgG6cv2Qc1EjwBRmzrMFbHC99bsxV7LO7xLe5-TvF_l6oxdKB2OLHgjrX0k2tcED7jsYCOAP5mRcWHfZkTBFJ_cQn9-OOIXFBzANUwxM3xLJhxR2zvtWvJIdoWU7NU"
                    alt=""
                  />
                  <span>+8M</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="section section-soft" id="funding">
          <div className="container" data-reveal>
            <div className="section-head">
              <div>
                <h2>Our Ecosystem of Growth</h2>
                <p>
                  Intelligent tools designed to accelerate MSME success and
                  streamline diaspora involvement.
                </p>
              </div>
              <a href="#">View all features</a>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <span className="material-symbols-outlined" aria-hidden="true">
                  payments
                </span>
                <h3>Micro Funding</h3>
                <p>
                  Direct peer-to-peer funding from diaspora investors starting
                  from small denominations.
                </p>
              </article>
              <article className="feature-card">
                <span className="material-symbols-outlined" aria-hidden="true">
                  diversity_3
                </span>
                <h3>Diaspora Mentorship</h3>
                <p>
                  One-on-one professional guidance from global industry leaders
                  to local founders.
                </p>
              </article>
              <article className="feature-card">
                <span className="material-symbols-outlined" aria-hidden="true">
                  psychology
                </span>
                <h3>AI Matching Engine</h3>
                <p>
                  Proprietary algorithms that pair the right investors with the
                  right businesses automatically.
                </p>
              </article>
              <article className="feature-card">
                <span className="material-symbols-outlined" aria-hidden="true">
                  smart_toy
                </span>
                <h3>AI Business Advisor</h3>
                <p>
                  24/7 localized AI support to help MSMEs manage bookkeeping,
                  marketing, and taxes.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section-dark" id="mentorship">
          <div className="container" data-reveal>
            <div className="section-head centered dark">
              <h2>Aligned with Global Goals</h2>
              <p>
                MicroFun is more than a platform; it&apos;s a mission to achieve
                the United Nations Sustainable Development Goals.
              </p>
            </div>

            <div className="goal-grid">
              <article>
                <div className="goal-box goal-red">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    menu_book
                  </span>
                </div>
                <p>Quality Education</p>
              </article>
              <article>
                <div className="goal-box goal-gold">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    trending_up
                  </span>
                </div>
                <p>
                  Decent Work and
                  <br />
                  Economic Growth
                </p>
              </article>
              <article>
                <div className="goal-box goal-blue">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    handshake
                  </span>
                </div>
                <p>
                  Partnerships for
                  <br />
                  the Goals
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section section-cta" id="forum">
          <div className="container" data-reveal>
            <div className="cta-box">
              <h2>Ready to Scale the Future?</h2>
              <p>
                Whether you&apos;re looking to fund your dream or invest in your
                homeland, MicroFun provides the bridge.
              </p>
              <div className="hero-actions centered-actions">
                <button type="button" className="solid-btn light">
                  Join as MSME
                </button>
                <button type="button" className="outline-btn light-outline">
                  Support as Diaspora
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-top">
          <div>
            <p className="brand">MicroFun</p>
            <p className="muted">
              Empowering Indonesian MSMEs through global diaspora connection and
              advanced AI matching.
            </p>
          </div>
          <nav aria-label="Footer links" className="footer-links">
            <a href="#">SDGs</a>
            <a href="#">Impact Reports</a>
            <a href="#">Legal Information</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </nav>
        </div>
        <div className="container footer-bottom">© 2024 MicroFun. All rights reserved.</div>
      </footer>
    </>
  )
}

export default LandingPage

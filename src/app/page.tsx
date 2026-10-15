import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  CalendarDays,
  Activity,
  HeartPulse,
  Check,
  FileHeart,
} from "lucide-react";
export default function Home() {
  return (
    <main className="home">
      <section className="editorial-hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" />
            PERSONAL CARE. IN YOUR OWN SPACE.
          </p>
          <h1>
            A little closer to
            <br />
            feeling <em>better.</em>
          </h1>
          <p className="hero-description">
            Expert nursing and physiotherapy, in the place you feel most
            yourself. Thoughtfully coordinated. Always personal.
          </p>
          <div className="actions">
            <Link href="/services" className="primary-link">
              Find your care <ArrowUpRight size={18} />
            </Link>
            <Link href="/providers" className="secondary-link">
              Meet your care team <ArrowRight size={17} />
            </Link>
          </div>
          <div className="hero-trust">
            <span className="trust-mark">
              <ShieldCheck size={21} />
            </span>
            <div>
              <strong>Care begins with trust</strong>
              <p>Reviewed credentials. Clear prices. Your choice.</p>
            </div>
          </div>
          <div className="hero-footnote">
            <span>01 / NURSING</span>
            <span>02 / PHYSIOTHERAPY</span>
          </div>
        </div>
        <div className="hero-photo">
          <Image
            src="/images/care-hero.png"
            alt="Illustration of a care professional talking with an older woman in a peaceful home"
            fill
            priority
            sizes="(max-width: 760px) 90vw, 47vw"
          />
          <span className="photo-tag">A familiar place. A fresh start.</span>
          <div className="photo-note">
            <span>
              <HeartHandshake size={25} />
            </span>
            <div>
              <strong>Good care feels like being heard.</strong>
              <p>Support shaped around your everyday life.</p>
            </div>
          </div>
          <small className="photo-disclosure">
            AI-generated illustration · Fictional people
          </small>
        </div>
      </section>
      <section className="trust-strip">
        <span>
          <ShieldCheck />
          Verified care professionals
        </span>
        <span>
          <CalendarDays />
          Visits that fit your routine
        </span>
        <span>
          <FileHeart />
          Your care, in one place
        </span>
      </section>
      <section className="home-services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">THE RIGHT SUPPORT, AT HOME</p>
            <h2>
              Small steps.
              <br />
              <span>Meaningful progress.</span>
            </h2>
          </div>
          <p>
            From everyday nursing support to getting moving again, find care
            that meets you where you are.
          </p>
          <Link className="text-link" href="/services">
            Explore all services <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="service-editorial-grid">
          <Link
            className="editorial-service sage"
            href="/services?category=nurse"
          >
            <div className="service-card-top">
              <span className="service-icon">
                <HeartPulse size={27} />
              </span>
              <span>01</span>
            </div>
            <h3>
              Nursing, with
              <br />a human touch.
            </h3>
            <p>
              Professional support for your nursing needs, with comfort and
              dignity at the centre.
            </p>
            <div className="editorial-card-bottom">
              <span>Explore home nursing</span>
              <ArrowUpRight size={23} />
            </div>
          </Link>
          <Link
            className="editorial-service sand"
            href="/services?category=physiotherapist"
          >
            <div className="service-card-top">
              <span className="service-icon">
                <Activity size={27} />
              </span>
              <span>02</span>
            </div>
            <h3>
              Move towards
              <br />
              your everyday.
            </h3>
            <p>
              Personal physiotherapy and documented progress, one considered
              visit at a time.
            </p>
            <div className="editorial-card-bottom">
              <span>Explore physiotherapy</span>
              <ArrowUpRight size={23} />
            </div>
          </Link>
        </div>
      </section>
      <section className="how-section" id="how-it-works">
        <div>
          <p className="eyebrow">LESS TO ARRANGE. MORE PEACE OF MIND.</p>
          <h2>
            We make room
            <br />
            for your recovery.
          </h2>
          <Link href="/auth?mode=register" className="text-link">
            Start your care journey <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="journey-steps">
          {[
            [
              "01",
              "Tell us what you need",
              "Choose your service, preferred time, and home address.",
            ],
            [
              "02",
              "We coordinate your visit",
              "Your care team checks availability and assigns a verified professional. Track confirmation in your workspace.",
            ],
            [
              "03",
              "Keep your care connected",
              "Follow visit notes, review your reports, and share only when you choose.",
            ],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
              <Check size={18} />
            </div>
          ))}
        </div>
      </section>
      <section className="home-cta">
        <div>
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h2>
            Care that comes to you.
            <br />
            Confidence that stays.
          </h2>
        </div>
        <Link href="/services" className="light-link">
          Let’s find your care <ArrowUpRight size={19} />
        </Link>
      </section>
    </main>
  );
}

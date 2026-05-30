import { FaFutbol } from "react-icons/fa";

export default function FootballLogo({ compact = false, className = "" }) {
  return (
    <div className={`home-hero-logo ${compact ? "home-hero-logo-compact" : ""} ${className}`}>
      <div className="home-football-row">
        <h1 className="home-football-title">
          <span>FO</span>
          <span className="home-ball-wrap">
            <span className="home-ball">
              <FaFutbol />
            </span>
          </span>
          <span>TBALL</span>
        </h1>
      </div>
      <div className="home-with">WITH</div>
      <div className="home-farmacists">FARMACISTS</div>
    </div>
  );
}

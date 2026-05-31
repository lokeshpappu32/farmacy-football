export default function FootballLogo({ compact = false, className = "" }) {
  return (
    <img
      src="/images/football-with-farmacists.png"
      alt="Football with Farmacists"
      className={`${compact ? "h-auto w-full max-w-[250px]" : "h-auto w-full max-w-[620px]"} object-contain ${className}`}
    />
  );
}

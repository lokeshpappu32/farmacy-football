export default function TeamLogo({ src, name }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white p-3 shadow-glow">
        {src ? <img src={src} alt={name} className="max-h-full max-w-full" /> : <span className="text-xl font-black text-pitch">{name?.slice(0, 2)}</span>}
      </div>
      <span className="text-sm font-bold">{name}</span>
    </div>
  );
}

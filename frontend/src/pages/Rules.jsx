const rules = [
  ["Enrollment", "+100 points automatically after registration."],
  ["Participation", "+50 points for submitting a match prediction."],
  ["Correct prediction", "+50 points when the selected team wins."],
  ["Edit window", "Predictions can be modified until match start time."],
  ["Wrong prediction", "No points are deducted."],
  ["Cancelled match", "Participation points are reverted if a match is cancelled."],
];

export default function Rules() {
  return (
    <div className="glass rounded-3xl p-6">
      <h1 className="text-3xl font-black">Campaign Rules</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rules.map(([title, copy]) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5">
            <h2 className="text-xl font-black text-gold">{title}</h2>
            <p className="mt-2 text-white/68">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

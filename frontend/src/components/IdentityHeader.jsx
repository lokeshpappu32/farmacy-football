import { useAuth } from "../context/AuthContext";

export default function IdentityHeader({ nameLabel = "Participant name", rank, points }) {
  const { participant } = useAuth();
  if (!participant) return null;
  const hasRank = rank !== null && rank !== undefined;
  const hasPoints = points !== null && points !== undefined;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 px-1 text-sm font-bold md:text-base">
      <span>
        <span className="text-white">{nameLabel}: </span>
        <span className="text-gold">{participant.full_name}</span>
      </span>
      <span>
        <span className="text-white">Country: </span>
        <span className="text-gold">{participant.country || "-"}</span>
      </span>
      {hasRank && (
        <span>
          <span className="text-white">Rank: </span>
          <span className="text-gold">{rank}</span>
        </span>
      )}
      {hasPoints && (
        <span>
          <span className="text-white">Points: </span>
          <span className="text-gold">{points}</span>
        </span>
      )}
    </div>
  );
}

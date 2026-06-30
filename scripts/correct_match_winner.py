import argparse

from app import create_app
from app.services.winner_correction_service import correct_match_winner, find_match_for_correction


def main():
    parser = argparse.ArgumentParser(description="Correct a finalized match winner and repair prediction points.")
    parser.add_argument("--match-id", type=int)
    parser.add_argument("--api-match-id")
    parser.add_argument("--team1")
    parser.add_argument("--team2")
    parser.add_argument("--winner", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        match = find_match_for_correction(
            match_id=args.match_id,
            api_match_id=args.api_match_id,
            team1=args.team1,
            team2=args.team2,
        )
        if not match:
            raise SystemExit("Match not found. Use --match-id, --api-match-id, or --team1/--team2.")
        result = correct_match_winner(match, args.winner, dry_run=args.dry_run)
        for key, value in result.items():
            print(f"{key}: {value}")


if __name__ == "__main__":
    main()

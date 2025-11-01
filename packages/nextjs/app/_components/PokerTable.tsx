"use client";

import { Card } from "./Card";

interface Player {
  address: string;
  chips: bigint;
  currentBet: bigint;
  hasFolded: boolean;
  isCurrentPlayer: boolean;
  isYou: boolean;
}

interface PokerTableProps {
  players: Player[];
  communityCards: readonly number[];
  pot: bigint;
  phase: number;
  yourCards?: {
    card1Value: number | undefined;
    card2Value: number | undefined;
    isDecrypted: boolean;
    isDecrypting: boolean;
  };
}

export function PokerTable({ players, communityCards, pot, phase, yourCards }: PokerTableProps) {
  // Debug: Log community cards rendering
  console.log("🎴 PokerTable Render:", {
    phase,
    communityCardsLength: communityCards.length,
    communityCards: Array.from(communityCards),
    shouldShowCards: phase >= 2 && communityCards.length > 0,
    yourCards,
    playersCount: players.length,
    youPlayer: players.find(p => p.isYou),
  });

  // Calculate player positions around the table (circular layout)
  const getPlayerPosition = (index: number, total: number) => {
    // Angle in radians (starting from top, going clockwise)
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;

    // Ellipse parameters (wider than tall)
    const radiusX = 45; // horizontal radius (%)
    const radiusY = 35; // vertical radius (%)

    const x = 50 + radiusX * Math.cos(angle);
    const y = 50 + radiusY * Math.sin(angle);

    return { x, y, angle };
  };

  return (
    <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-green-800 to-green-900 rounded-3xl shadow-2xl overflow-hidden">
      {/* Poker table surface */}
      <div className="absolute inset-6 bg-gradient-to-br from-green-700 to-green-800 rounded-[50%] shadow-inner border-8 border-amber-900">
        {/* Inner felt texture */}
        <div className="absolute inset-3 bg-green-700 rounded-[50%] opacity-50"></div>

        {/* Community cards in center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="flex flex-col items-center gap-2">
            {/* Pot display */}
            <div className="bg-amber-900 bg-opacity-90 px-4 py-1.5 rounded-full shadow-lg">
              <p className="text-white text-xs font-bold">POT: {pot.toString()} chips</p>
            </div>

            {/* Community cards */}
            <div className="flex gap-1.5">
              {phase >= 2 && communityCards.length > 0 ? (
                <>
                  <Card value={communityCards[0]} size="sm" />
                  <Card value={communityCards[1]} size="sm" />
                  <Card value={communityCards[2]} size="sm" />
                </>
              ) : (
                <>
                  <Card isHidden size="sm" />
                  <Card isHidden size="sm" />
                  <Card isHidden size="sm" />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Players around the table */}
        {players.map((player, index) => {
          const { x, y } = getPlayerPosition(index, players.length);

          return (
            <div
              key={player.address}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <div className={`flex flex-col items-center gap-2 ${player.isCurrentPlayer ? "animate-pulse" : ""}`}>
                {/* Player cards (only show for "you") */}
                {player.isYou && phase >= 1 && (
                  <div className="flex gap-1 mb-1">
                    {yourCards?.isDecrypted ? (
                      <>
                        <Card value={yourCards.card1Value} size="xs" />
                        <Card value={yourCards.card2Value} size="xs" />
                      </>
                    ) : (
                      <>
                        <Card isHidden size="xs" />
                        <Card isHidden size="xs" />
                      </>
                    )}
                  </div>
                )}

                {/* Player info card */}
                <div
                  className={`
                    relative px-3 py-1.5 rounded-lg shadow-lg min-w-[120px]
                    ${player.isYou ? "bg-blue-600 ring-2 ring-blue-400" : "bg-gray-800"}
                    ${player.isCurrentPlayer ? "ring-3 ring-yellow-400 ring-offset-1 ring-offset-green-700" : ""}
                    ${player.hasFolded ? "opacity-50 grayscale" : ""}
                  `}
                >
                  {/* Current player indicator */}
                  {player.isCurrentPlayer && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                      <div className="text-yellow-400 text-xl animate-bounce">👇</div>
                    </div>
                  )}

                  {/* Player address */}
                  <p className="text-white text-xs font-semibold text-center truncate">
                    {player.isYou ? "🎮 YOU" : `${player.address.slice(0, 6)}...${player.address.slice(-4)}`}
                  </p>

                  {/* Chips */}
                  <p className="text-white text-xs text-center">💰 {player.chips.toString()}</p>

                  {/* Current bet */}
                  {player.currentBet > 0n && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
                      <div className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                        Bet: {player.currentBet.toString()}
                      </div>
                    </div>
                  )}

                  {/* Folded indicator */}
                  {player.hasFolded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-red-500 text-sm font-bold">FOLDED</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

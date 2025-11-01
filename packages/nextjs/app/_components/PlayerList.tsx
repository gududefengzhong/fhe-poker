"use client";

interface Player {
  address: string;
  chips: number;
  isActive: boolean;
  hasFolded: boolean;
  currentBet: number;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerIndex?: number;
  myAddress?: string;
}

export function PlayerList({ players, currentPlayerIndex, myAddress }: PlayerListProps) {
  const getPlayerAvatar = (address: string) => {
    // Generate deterministic avatar based on address
    const avatars = ["🧑‍💼", "👨‍💼", "👩‍💼", "🧑‍🎓", "👨‍🎓", "👩‍🎓", "🧑‍🔬", "👨‍🔬"];
    const index = parseInt(address.slice(2, 4), 16) % avatars.length;
    return avatars[index];
  };

  const getPlayerColor = (address: string) => {
    // Generate deterministic color based on address
    const colors = [
      "from-blue-500 to-cyan-500",
      "from-green-500 to-emerald-500",
      "from-purple-500 to-pink-500",
      "from-orange-500 to-red-500",
      "from-yellow-500 to-amber-500",
      "from-indigo-500 to-violet-500",
    ];
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    return colors[index];
  };

  return (
    <div className="card bg-base-200 shadow-lg">
      <div className="card-body p-4">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <span>👥</span>
          <span>Players ({players.length}/6)</span>
        </h4>
        <div className="divider my-1"></div>
        <div className="space-y-2">
          {players.map((player, index) => {
            const isCurrentPlayer = currentPlayerIndex === index;
            const isMe = player.address.toLowerCase() === myAddress?.toLowerCase();

            return (
              <div
                key={player.address}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                  isCurrentPlayer ? "bg-primary/20 ring-2 ring-primary" : "bg-base-300"
                } ${player.hasFolded ? "opacity-50" : ""}`}
              >
                {/* Avatar */}
                <div className={`avatar placeholder ${isCurrentPlayer ? "animate-pulse" : ""}`}>
                  <div className={`bg-gradient-to-br ${getPlayerColor(player.address)} rounded-full w-10 h-10`}>
                    <span className="text-xl">{getPlayerAvatar(player.address)}</span>
                  </div>
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold truncate">
                      {player.address.slice(0, 6)}...{player.address.slice(-4)}
                    </p>
                    {isMe && <span className="badge badge-primary badge-xs">You</span>}
                    {isCurrentPlayer && <span className="badge badge-success badge-xs">Turn</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-base-content/70">
                    <span>💰 {player.chips}</span>
                    {player.currentBet > 0 && <span>• Bet: {player.currentBet}</span>}
                    {player.hasFolded && <span>• Folded</span>}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex flex-col items-end gap-1">
                  {player.isActive && !player.hasFolded && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                  {player.hasFolded && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Slots */}
        {players.length < 6 && (
          <div className="mt-2">
            {Array.from({ length: 6 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-2 p-2 rounded-lg bg-base-300/30 mb-2">
                <div className="avatar placeholder">
                  <div className="bg-base-300 rounded-full w-10 h-10">
                    <span className="text-xl opacity-30">👤</span>
                  </div>
                </div>
                <p className="text-xs text-base-content/30">Empty Seat</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

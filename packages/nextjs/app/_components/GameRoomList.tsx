"use client";

import { useState } from "react";
import { useReadContract } from "wagmi";
import { useTransaction } from "~~/contexts/TransactionContext";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { useGameEvents } from "~~/hooks/useGameEvents";
import type { AllowedChainIds } from "~~/utils/helper/networks";

interface GameRoomListProps {
  chainId?: AllowedChainIds;
  onSelectGame: (gameId: string) => void;
}

export function GameRoomList({ chainId, onSelectGame }: GameRoomListProps) {
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  // Get contract info
  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId,
  });

  // Read total game count (no polling, will be updated by events)
  const { data: gameCounter, refetch: refetchGameCounter } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "gameCounter",
  });

  const totalGames = gameCounter ? Number(gameCounter) : 0;

  // Listen to game events to trigger real-time updates
  useGameEvents({
    chainId,
    onGameCreated: () => {
      console.log("🔄 GameRoomList: Game created, refetching...");
      refetchGameCounter();
      setLastUpdateTime(Date.now());
    },
    onPlayerJoined: () => {
      console.log("🔄 GameRoomList: Player joined, updating...");
      setLastUpdateTime(Date.now());
    },
    onGameStarted: () => {
      console.log("🔄 GameRoomList: Game started, updating...");
      setLastUpdateTime(Date.now());
    },
    onPhaseChanged: () => {
      console.log("🔄 GameRoomList: Phase changed, updating...");
      setLastUpdateTime(Date.now());
    },
    onGameEnded: () => {
      console.log("🔄 GameRoomList: Game ended, updating...");
      setLastUpdateTime(Date.now());
    },
  });

  // Read info for recent games (last 10)
  const recentGameIds = Array.from({ length: Math.min(10, totalGames) }, (_, i) => totalGames - 1 - i).filter(
    id => id >= 0,
  );

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">🎮 Active Game Rooms</h3>
        <p className="text-sm text-base-content/70">Join an existing game or create your own</p>

        <div className="divider"></div>

        {totalGames === 0 ? (
          <div className="text-center py-8">
            <p className="text-base-content/50">No games yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentGameIds.map(gameId => (
              <GameRoomItem
                key={`${gameId}-${lastUpdateTime}`}
                gameId={gameId}
                contractInfo={contractInfo}
                onSelect={onSelectGame}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GameRoomItemProps {
  gameId: number;
  contractInfo: any;
  onSelect: (gameId: string) => void;
}

function GameRoomItem({ gameId, contractInfo, onSelect }: GameRoomItemProps) {
  const { pendingAction, pendingGameId, isConfirming } = useTransaction();

  // Read game info (no polling, will be updated by parent's lastUpdateTime change)
  const { data: gameInfo } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getGameInfo",
    args: [BigInt(gameId)],
  });

  if (!gameInfo) {
    return (
      <div className="card bg-base-200 animate-pulse">
        <div className="card-body p-4">
          <div className="h-4 bg-base-300 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const [phase, playerCount, pot] = gameInfo as [number, number, bigint, number, bigint, string, string, bigint];
  const phaseNames = ["Waiting", "Pre-Flop", "Flop", "Showdown", "Finished"];
  const phaseName = phaseNames[phase] || "Unknown";

  // 只有当前游戏正在进行交易时才显示 Confirming
  const isThisGamePending =
    isConfirming &&
    ((pendingAction === "join" && pendingGameId === gameId) || (pendingAction === "start" && pendingGameId === gameId));

  // Status badge color
  const getStatusColor = () => {
    if (isThisGamePending) return "badge-info"; // Confirming
    if (phase === 0) return "badge-success"; // Waiting - can join
    if (phase === 4) return "badge-error"; // Finished
    return "badge-warning"; // In progress
  };

  const canJoin = phase === 0 && playerCount < 6;

  return (
    <div
      className={`card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer ${canJoin ? "border-2 border-success" : ""}`}
      onClick={() => onSelect(gameId.toString())}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-10">
                <span className="text-xs">#{gameId}</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold">Game #{gameId}</h4>
              <div className="flex items-center gap-2 text-xs text-base-content/70">
                <span>👥 {playerCount.toString()}/6</span>
                <span>•</span>
                <span>💰 {pot.toString()} chips</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`badge ${getStatusColor()} badge-sm`}>
              {isThisGamePending ? "Confirming..." : phaseName}
            </div>
            {canJoin && !isThisGamePending && <div className="badge badge-outline badge-xs">Can Join</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

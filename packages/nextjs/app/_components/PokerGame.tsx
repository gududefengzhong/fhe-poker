"use client";

import { useEffect, useState } from "react";
import { GameRoomList } from "./GameRoomList";
import { GameTable } from "./GameTable";
import toast from "react-hot-toast";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useTransaction } from "~~/contexts/TransactionContext";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { useGameEvents } from "~~/hooks/useGameEvents";
import type { AllowedChainIds } from "~~/utils/helper/networks";

export function PokerGame() {
  const { address, chainId } = useAccount();
  const [gameId, setGameId] = useState<string>("");
  const [selectedGameId, setSelectedGameId] = useState<string>("");
  const [showGameTable, setShowGameTable] = useState<boolean>(false);

  // Get contract info
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: contractInfo, isLoading: isContractLoading } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId: allowedChainId,
  });

  // Read game counter
  const { data: gameCounter, refetch: refetchGameCounter } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "gameCounter",
  });

  console.log("🔍 PokerGame Debug:", {
    address,
    chainId,
    allowedChainId,
    contractAddress: contractInfo?.address,
    isContractLoading,
    gameCounter: gameCounter?.toString(),
  });

  // Read game info
  const { data: gameInfoRaw } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getGameInfo",
    args: selectedGameId ? [BigInt(selectedGameId)] : undefined,
  });

  // Type assertion for gameInfo
  const gameInfo = gameInfoRaw as readonly [number, number, bigint, number, bigint, string, string, bigint] | undefined;

  // Use shared transaction state
  const { pendingTxHash, pendingAction, isConfirming, isConfirmed, setPendingTransaction, clearPendingTransaction } =
    useTransaction();

  // Write contract
  const { writeContractAsync } = useWriteContract();

  // Listen to game events
  useGameEvents({
    chainId: allowedChainId,
    onGameCreated: (gameId, creator) => {
      console.log("🎮 Game created event received:", { gameId: gameId.toString(), creator });

      // If this is our transaction, clear pending state and show success
      if (pendingAction === "create" && address?.toLowerCase() === creator.toLowerCase()) {
        const newGameId = Number(gameId);
        console.log("✅ Our game created successfully:", newGameId);
        toast.success(`Game #${newGameId} created successfully!`, { id: "create-game" });
        setGameId(newGameId.toString());
        clearPendingTransaction();
      }

      // Refetch game counter to update the list
      refetchGameCounter();
    },
    onPlayerJoined: (gameId, player) => {
      console.log("👥 Player joined event received:", { gameId: gameId.toString(), player });

      // If this is our transaction, clear pending state
      if (pendingAction === "join" && address?.toLowerCase() === player.toLowerCase()) {
        console.log("✅ We joined game successfully:", gameId.toString());
        clearPendingTransaction();
      }

      // Refetch game counter to update the list
      refetchGameCounter();
    },
    onGameStarted: gameId => {
      console.log("🚀 Game started event received:", { gameId: gameId.toString() });

      // If this is our transaction, clear pending state
      if (pendingAction === "start") {
        console.log("✅ Game started successfully:", gameId.toString());
        clearPendingTransaction();
      }

      // Refetch game counter to update the list
      refetchGameCounter();
    },
  });

  // Safety: Clear pending state if transaction is confirmed but event hasn't fired yet
  // This handles edge cases where event listener might miss the event
  useEffect(() => {
    if (isConfirmed && pendingTxHash && pendingAction) {
      console.log("⚠️ Transaction confirmed, waiting for event...", {
        pendingAction,
        pendingTxHash,
      });

      // Wait 60 seconds for event to fire, then clear state as fallback
      const timeout = setTimeout(() => {
        console.warn("⚠️ Event not received after 60s, clearing state as fallback");
        toast.success("Transaction confirmed! Game list updating...", {
          id: `${pendingAction}-game`,
          duration: 3000,
        });
        clearPendingTransaction();
        refetchGameCounter();
      }, 60000);

      return () => clearTimeout(timeout);
    }
  }, [isConfirmed, pendingTxHash, pendingAction, clearPendingTransaction, refetchGameCounter]);

  // Safety timeout: reset state after 90 seconds if still pending
  useEffect(() => {
    if (pendingTxHash && pendingAction) {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Transaction timeout after 90s, resetting state...");
        clearPendingTransaction();
        toast("Transaction is taking longer than expected. Please check your wallet or block explorer.", {
          id: `${pendingAction}-game`,
          icon: "⏱️",
          duration: 5000,
        });
      }, 90000); // 90 seconds

      return () => clearTimeout(timeout);
    }
  }, [pendingTxHash, pendingAction, clearPendingTransaction]);

  const handleCreateGame = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    if (!contractInfo) {
      toast.error("Contract not loaded. Please refresh the page.");
      return;
    }

    // Check if connected to correct network (only Sepolia)
    if (chainId !== 11155111) {
      toast.error(`Please switch to Sepolia Testnet (Chain ID: 11155111). Current chain ID: ${chainId}`);
      return;
    }

    try {
      toast.loading("Creating game...", { id: "create-game" });
      const hash = await writeContractAsync({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "createGame",
        args: [],
        gas: 5000000n, // 5M gas limit (safe for Sepolia)
      });
      setPendingTransaction(hash, "create");
      toast.success("Game created! Waiting for confirmation...", { id: "create-game" });
    } catch (error: any) {
      console.error("Error creating game:", error);
      clearPendingTransaction();
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled.", { id: "create-game" });
      } else {
        // Extract short error message
        const shortError = error.message?.split("\n")[0] || "Unknown error";
        toast.error(shortError.slice(0, 100), { id: "create-game" });
      }
    }
  };

  const handleJoinGame = async () => {
    if (!gameId || !contractInfo) {
      toast.error("Please enter a game ID");
      return;
    }

    try {
      toast.loading("Joining game...", { id: "join-game" });
      const hash = await writeContractAsync({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "joinGame",
        args: [BigInt(gameId)],
        gas: 5000000n, // 5M gas limit (safe for Sepolia)
      });
      setPendingTransaction(hash, "join", Number(gameId));
      toast.success("Joining game... Waiting for confirmation", { id: "join-game" });
    } catch (error: any) {
      console.error("Error joining game:", error);
      clearPendingTransaction();
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled.", { id: "join-game" });
      } else {
        const shortError = error.message?.split("\n")[0] || "Unknown error";
        toast.error(shortError.slice(0, 100), { id: "join-game" });
      }
    }
  };

  const handleStartGame = async () => {
    if (!gameId || !contractInfo) {
      toast.error("Please enter a game ID");
      return;
    }

    try {
      toast.loading("Starting game...", { id: "start-game" });
      const hash = await writeContractAsync({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "startGame",
        args: [BigInt(gameId)],
        gas: 10000000n, // 10M gas for dealing cards with FHE encryption
      });
      setPendingTransaction(hash, "start", Number(gameId));
      toast.success("Starting game... Waiting for confirmation", { id: "start-game" });
    } catch (error: any) {
      console.error("Error starting game:", error);
      clearPendingTransaction();
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled.", { id: "start-game" });
      } else {
        const shortError = error.message?.split("\n")[0] || "Unknown error";
        toast.error(shortError.slice(0, 100), { id: "start-game" });
      }
    }
  };

  const handleViewGame = () => {
    setSelectedGameId(gameId);
    setShowGameTable(true);
  };

  const getPhaseText = (phase: number) => {
    const phases = ["Waiting", "Pre-Flop", "Flop", "Turn", "River", "Showdown", "Finished"];
    return phases[phase] || "Unknown";
  };

  // If viewing a game table, show it
  if (showGameTable && selectedGameId) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <button className="btn btn-ghost btn-sm self-start" onClick={() => setShowGameTable(false)}>
          ← Back to Lobby
        </button>
        <GameTable gameId={selectedGameId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-3xl font-bold text-gray-900">🎮 FHE Texas Hold&apos;em Poker</h2>
          <p className="text-base font-semibold text-gray-700">
            Privacy-preserving on-chain poker using Fully Homomorphic Encryption
          </p>
          {address ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-green-600">
                ✅ Wallet: {address.slice(0, 6)}...{address.slice(-4)}
              </p>
              {chainId === 31337 ? (
                <p className="text-sm font-bold text-green-600">✅ Network: Hardhat Local (Chain ID: {chainId})</p>
              ) : chainId === 11155111 ? (
                <p className="text-sm font-bold text-green-600">✅ Network: Sepolia Testnet (Chain ID: {chainId})</p>
              ) : (
                <div className="alert alert-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-bold">Wrong Network!</h3>
                    <div className="text-xs">
                      <p>Current: Chain ID {chainId}</p>
                      <p>Required: Hardhat Local (Chain ID 31337) or Sepolia Testnet (Chain ID 11155111)</p>
                      <p className="mt-2">Please switch to one of the supported networks in MetaMask.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm font-bold text-orange-600">Please connect your wallet</p>
          )}
        </div>
      </div>

      {/* Game Stats */}
      <div className="stats shadow w-full">
        <div className="stat">
          <div className="stat-title">Total Games</div>
          <div className="stat-value">{gameCounter?.toString() || "0"}</div>
          <div className="stat-desc">Games created</div>
        </div>
      </div>

      {/* Create Game */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Create New Game</h3>
          <p className="text-sm text-base-content/70">Start a new poker table. You&apos;ll be the game creator.</p>
          <div className="card-actions justify-end">
            <button
              className="btn btn-primary"
              onClick={handleCreateGame}
              disabled={!address || (pendingAction === "create" && isConfirming)}
            >
              {pendingAction === "create" && isConfirming ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Confirming...
                </>
              ) : (
                "Create Game"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Room List */}
      <GameRoomList
        chainId={allowedChainId}
        onSelectGame={gameId => {
          setGameId(gameId);
          setSelectedGameId(gameId);
          setShowGameTable(true);
        }}
      />

      {/* Join Game */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">Join or Manage Game</h3>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Game ID</span>
            </label>
            <input
              type="text"
              placeholder="Enter game ID"
              className="input input-bordered"
              value={gameId}
              onChange={e => setGameId(e.target.value)}
            />
          </div>
          <div className="card-actions justify-end gap-2">
            <button className="btn btn-secondary" onClick={handleViewGame} disabled={!gameId || gameId.trim() === ""}>
              View Game
            </button>
            <button
              className="btn btn-accent"
              onClick={handleJoinGame}
              disabled={!address || !gameId || gameId.trim() === "" || (pendingAction === "join" && isConfirming)}
            >
              {pendingAction === "join" && isConfirming ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Confirming...
                </>
              ) : (
                "Join Game"
              )}
            </button>
            <button
              className="btn btn-success"
              onClick={handleStartGame}
              disabled={!address || !gameId || gameId.trim() === "" || (pendingAction === "start" && isConfirming)}
            >
              {pendingAction === "start" && isConfirming ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Confirming...
                </>
              ) : (
                "Start Game"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Info */}
      {selectedGameId && gameInfo && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">Game #{selectedGameId} Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Phase</div>
                <div className="stat-value text-2xl">{getPhaseText(Number(gameInfo[0]))}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Players</div>
                <div className="stat-value text-2xl">{gameInfo[1].toString()}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Pot</div>
                <div className="stat-value text-2xl">{gameInfo[2].toString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How to Play */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h3 className="card-title">How to Play</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Connect your wallet using the button in the top right</li>
            <li>Create a new game or join an existing one using the game ID</li>
            <li>Wait for at least 2 players to join</li>
            <li>The game creator starts the game</li>
            <li>Your hole cards are encrypted on-chain - only you can see them!</li>
            <li>Play poker: Fold, Check, Call, or Raise</li>
            <li>Best hand wins the pot!</li>
          </ol>
          <div className="alert alert-info mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>
              <strong>Privacy Note:</strong> Your hole cards are encrypted using FHE. No one can see them until
              showdown!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

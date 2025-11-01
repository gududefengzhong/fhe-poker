"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionHistory } from "./ActionHistory";
import { DealerAvatar } from "./DealerAvatar";
import { PokerTable } from "./PokerTable";
import { useFhevm } from "fhevm-sdk/react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useTransaction } from "~~/contexts/TransactionContext";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { useGameEvents } from "~~/hooks/useGameEvents";
import { usePlayerCards } from "~~/hooks/usePlayerCards";
import { getAvailableActions } from "~~/utils/helper/gameActions";
import type { AllowedChainIds } from "~~/utils/helper/networks";

interface GameTableProps {
  gameId: string;
}

export function GameTable({ gameId }: GameTableProps) {
  const { address, chainId } = useAccount();
  const [raiseAmount, setRaiseAmount] = useState<string>("20");

  // Initialize FHEVM instance
  // IMPORTANT: For Sepolia, we must use an HTTP RPC URL, not window.ethereum
  // because the SDK needs to call contract methods directly
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    // For Sepolia (chainId 11155111), use Alchemy HTTP RPC
    if (chainId === 11155111) {
      const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
      if (alchemyKey) {
        const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`;
        console.log("🌐 Using Alchemy RPC for FHEVM:", rpcUrl.substring(0, 50) + "...");
        return rpcUrl;
      } else {
        console.warn("⚠️ No Alchemy API key found, falling back to public RPC");
        return "https://sepolia.drpc.org";
      }
    }

    // For other networks, use window.ethereum
    const eth = (window as any).ethereum;
    console.log("🌐 Provider check:", {
      hasEthereum: !!eth,
      selectedAddress: eth?.selectedAddress,
      chainId: eth?.chainId,
      isMetaMask: eth?.isMetaMask,
    });
    return eth;
  }, [chainId]);

  const initialMockChains = { 31337: "http://localhost:8545" };

  // Lazy initialization: only enable FHEVM when user is actually in a game
  const [shouldInitFhevm, setShouldInitFhevm] = useState(false);

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
    refresh: refreshFhevm,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: shouldInitFhevm && !!address && !!chainId,
  });

  console.log("🔐 FHEVM Instance Status:", {
    status: fhevmStatus,
    hasInstance: !!fhevmInstance,
    error: fhevmError?.message,
    address,
    chainId,
    shouldInitFhevm,
    enabled: shouldInitFhevm && !!address && !!chainId,
  });

  // Auto-retry if FHEVM instance fails to initialize (max 3 retries)
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [showError, setShowError] = useState(false);

  // Delay showing error to avoid flash during initialization
  useEffect(() => {
    if (fhevmStatus === "error") {
      const timer = setTimeout(() => setShowError(true), 2000); // Wait 2 seconds before showing error
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [fhevmStatus]);

  useEffect(() => {
    if (fhevmStatus === "error" && address && chainId && retryCount < maxRetries) {
      console.warn(
        `⚠️ FHEVM instance failed to initialize (attempt ${retryCount + 1}/${maxRetries}), retrying in 3 seconds...`,
      );
      console.error("Error details:", fhevmError);
      const timeout = setTimeout(() => {
        console.log(`🔄 Retrying FHEVM instance initialization (attempt ${retryCount + 2}/${maxRetries})...`);
        setRetryCount(prev => prev + 1);
        refreshFhevm();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [fhevmStatus, address, chainId, refreshFhevm, retryCount, fhevmError]);

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: contractInfo, isLoading: isContractLoading } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId: allowedChainId,
  });

  console.log("🔍 GameTable Contract Info:", {
    chainId,
    allowedChainId,
    contractAddress: contractInfo?.address,
    isContractLoading,
    hasAbi: !!contractInfo?.abi,
  });

  const {
    data: gameInfo,
    refetch: refetchGameInfo,
    isLoading: isGameInfoLoading,
    error: gameInfoError,
  } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getGameInfo",
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: !!contractInfo?.address && !!gameId,
    },
  });

  // Debug: Log contract call details
  console.log("📞 Contract Call Details:", {
    contractAddress: contractInfo?.address,
    gameId,
    args: gameId ? [BigInt(gameId)] : undefined,
    enabled: !!contractInfo?.address && !!gameId,
    isLoading: isGameInfoLoading,
    hasData: !!gameInfo,
    error: gameInfoError?.message,
  });

  // Get community cards (public, no decryption needed)
  const { data: communityCardsData, refetch: refetchCommunityCards } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getCommunityCards",
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: !!contractInfo?.address && !!gameId,
    },
  });

  const communityCards = useMemo(
    () => (communityCardsData as readonly number[] | undefined) || [],
    [communityCardsData],
  );

  // Get players information
  const { data: playersData, refetch: refetchPlayers } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getPlayers",
    args: gameId ? [BigInt(gameId)] : undefined,
    query: {
      enabled: !!contractInfo?.address && !!gameId,
    },
  });

  const [playerAddresses, playerChips, playerBets, playerFolded] = (playersData as
    | [readonly `0x${string}`[], readonly bigint[], readonly bigint[], readonly boolean[]]
    | undefined) || [[], [], [], []];

  // Get and decrypt player's hole cards
  const playerCards = usePlayerCards({
    instance: fhevmInstance,
    gameId,
    playerAddress: address as `0x${string}` | undefined,
    chainId,
    initialMockChains,
  });

  console.log("🃏 Player Cards:", {
    hasCards: !!playerCards.card1Handle && !!playerCards.card2Handle,
    isDecrypted: playerCards.isDecrypted,
    card1Value: playerCards.card1Value,
    card2Value: playerCards.card2Value,
    canDecrypt: playerCards.canDecrypt,
    isDecrypting: playerCards.isDecrypting,
    decryptError: playerCards.decryptError,
  });

  // Lazy initialization: initialize FHEVM when player is in a game
  useEffect(() => {
    // Check if player is in the game (their address is in the players list)
    const isPlayerInGame = playerAddresses.some(
      addr => addr.toLowerCase() === address?.toLowerCase()
    );

    if (isPlayerInGame && !shouldInitFhevm) {
      console.log("🔐 Player is in game, initializing FHEVM...");
      setShouldInitFhevm(true);
    }
  }, [playerAddresses, address, shouldInitFhevm]);

  // Use shared transaction state
  const { pendingAction, isConfirming, setPendingTransaction, clearPendingTransaction } = useTransaction();

  const { writeContractAsync, isPending } = useWriteContract();

  // Listen to game events for real-time updates
  useGameEvents({
    chainId: allowedChainId,
    onGameStarted: eventGameId => {
      if (Number(eventGameId) === Number(gameId)) {
        console.log("🚀 Game started event for current game");
        refetchGameInfo();
        refetchCommunityCards();
        refetchPlayers();
        if (pendingAction === "start") {
          clearPendingTransaction();
        }
      }
    },
    onPlayerAction: eventGameId => {
      if (Number(eventGameId) === Number(gameId)) {
        console.log("🎯 Player action event for current game");
        refetchGameInfo();
        refetchPlayers();
        if (pendingAction === "playerAction") {
          clearPendingTransaction();
        }
      }
    },
    onPhaseChanged: eventGameId => {
      if (Number(eventGameId) === Number(gameId)) {
        console.log("🔄 Phase changed event for current game");
        refetchGameInfo();
        refetchCommunityCards();
        refetchPlayers();
      }
    },
    onGameEnded: eventGameId => {
      if (Number(eventGameId) === Number(gameId)) {
        console.log("🏆 Game ended event for current game");
        refetchGameInfo();
        refetchCommunityCards();
        refetchPlayers();
      }
    },
  });

  // Initial load: fetch all data when component mounts or gameId changes
  useEffect(() => {
    if (gameId && contractInfo?.address) {
      console.log("🔄 Initial load for game:", gameId);
      refetchGameInfo();
      refetchCommunityCards();
      refetchPlayers();
    }
  }, [gameId, contractInfo?.address, refetchGameInfo, refetchCommunityCards, refetchPlayers]);

  const handleStartGame = async () => {
    if (!contractInfo) return;
    try {
      const hash = await writeContractAsync({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "startGame",
        args: [BigInt(gameId)],
        gas: 10000000n, // 10M gas for dealing cards with FHE encryption
      });
      setPendingTransaction(hash, "start", Number(gameId));
    } catch (error) {
      console.error("Error starting game:", error);
      clearPendingTransaction();
    }
  };

  const handleAction = async (action: number, amount?: number) => {
    if (!contractInfo) return;
    try {
      const hash = await writeContractAsync({
        address: contractInfo.address as `0x${string}`,
        abi: contractInfo.abi,
        functionName: "playerAction",
        args: [BigInt(gameId), action, amount || 0],
        gas: 5000000n, // 5M gas limit (safe for Sepolia)
      });
      setPendingTransaction(hash, "playerAction", Number(gameId));
    } catch (error) {
      console.error("Error performing action:", error);
      clearPendingTransaction();
    }
  };

  // Parse game info (with safe defaults to avoid errors before data is loaded)
  const [phase, playerCount, pot, currentPlayerIndex, currentBet, gameCreator, winner, winnings] = (gameInfo as [
    number,
    number,
    bigint,
    number,
    bigint,
    `0x${string}`,
    `0x${string}`,
    bigint,
  ]) || [
    0,
    0,
    0n,
    0,
    0n,
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
    0n,
  ];
  const phaseNames = ["Waiting", "Pre-Flop", "Flop", "Showdown", "Finished"];

  // Prepare player data for PokerTable component
  const players = useMemo(() => {
    return playerAddresses.map((addr, index) => ({
      address: addr,
      chips: playerChips[index] || 0n,
      currentBet: playerBets[index] || 0n,
      hasFolded: playerFolded[index] || false,
      isCurrentPlayer: index === currentPlayerIndex && phase >= 1 && phase < 3,
      isYou: addr.toLowerCase() === address?.toLowerCase(),
    }));
  }, [playerAddresses, playerChips, playerBets, playerFolded, currentPlayerIndex, phase, address]);

  // Find current player's data
  const currentPlayer = useMemo(() => {
    return players.find(p => p.isYou);
  }, [players]);

  // Calculate available actions for current player
  const availableActions = useMemo(() => {
    if (!currentPlayer) {
      return {
        canFold: false,
        canCheck: false,
        canCall: false,
        canRaise: false,
      };
    }
    return getAvailableActions(
      currentPlayer.currentBet,
      currentBet,
      currentPlayer.chips,
      currentPlayer.isCurrentPlayer,
    );
  }, [currentPlayer, currentBet]);

  console.log("🎮 GameTable Debug:", {
    gameId,
    phase,
    playerCount,
    pot: pot.toString(),
    gameInfo,
    rawGameInfo: JSON.stringify(gameInfo),
  });

  // Debug community cards in detail
  useEffect(() => {
    console.log("🃏 Community Cards Debug:", {
      communityCardsData,
      communityCardsType: typeof communityCardsData,
      communityCardsIsArray: Array.isArray(communityCardsData),
      communityCards,
      communityCardsLength: communityCards.length,
      phase,
      shouldShowCards: phase >= 2,
      gameId,
      contractAddress: contractInfo?.address,
      rawData: communityCardsData ? JSON.stringify(communityCardsData) : "undefined",
    });
  }, [communityCardsData, communityCards, phase, gameId, contractInfo?.address]);

  // Debug function to manually check contract
  const debugContract = async () => {
    if (!contractInfo?.address) {
      console.error("❌ No contract address");
      return;
    }

    console.log("🔍 Manual Contract Check:");
    console.log("  Contract Address:", contractInfo.address);
    console.log("  Game ID:", gameId);
    console.log("  Chain ID:", chainId);

    // Force refetch
    const result = await refetchGameInfo();
    console.log("  Refetch Result:", result);
  };

  // Render error/loading states
  if (!address) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center text-warning">⚠️ Please connect your wallet</p>
        </div>
      </div>
    );
  }

  if (!chainId || chainId !== 11155111) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center text-error">❌ Please switch to Sepolia network</p>
          <p className="text-center text-sm opacity-70">Current chain ID: {chainId || "Not connected"}</p>
        </div>
      </div>
    );
  }

  if (isContractLoading || !contractInfo) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (isGameInfoLoading || !gameInfo) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center">Loading game...</p>
        </div>
      </div>
    );
  }

  // Show FHEVM initialization status (only if we're trying to initialize)
  if (shouldInitFhevm && fhevmStatus === "loading") {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center">🔐 Initializing encryption system...</p>
          <p className="text-center text-sm opacity-70">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  // Only show error after delay to avoid flash during initialization (and only if we need FHEVM)
  if (shouldInitFhevm && fhevmStatus === "error" && showError) {
    return (
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <p className="text-center text-error">❌ Failed to initialize encryption system</p>
          <p className="text-center text-sm opacity-70 mb-2">{fhevmError?.message || "Unknown error"}</p>
          {retryCount >= maxRetries && (
            <div className="alert alert-warning mt-2">
              <span className="text-sm">
                ⚠️ Maximum retry attempts reached ({maxRetries}). This may be a temporary network issue with Zama&apos;s
                FHEVM infrastructure on Sepolia.
                <br />
                <br />
                <strong>Possible solutions:</strong>
                <ul className="list-disc list-inside mt-2">
                  <li>Wait a few minutes and refresh the page</li>
                  <li>Check if Sepolia testnet is experiencing issues</li>
                  <li>Try using a different RPC endpoint</li>
                </ul>
              </span>
            </div>
          )}
          <button
            className="btn btn-primary mt-4"
            onClick={() => {
              setRetryCount(0);
              refreshFhevm();
            }}
          >
            🔄 Retry {retryCount > 0 && `(${retryCount}/${maxRetries} attempts used)`}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="card bg-gradient-to-br from-purple-900 to-indigo-900 shadow-xl">
            <div className="card-body items-center p-6">
              <DealerAvatar gameId={gameId} size="md" showGreeting={true} />
            </div>
          </div>
          <ActionHistory gameId={Number(gameId)} />
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Game #{gameId}</h3>
                  <p className="text-sm opacity-70">
                    Phase: {phaseNames[phase]} | Players: {playerCount.toString()}
                  </p>
                  {phase >= 1 && phase < 4 && playerAddresses.length > 0 && (
                    <p className="text-sm opacity-70 mt-1">
                      Current Turn:{" "}
                      <span className="font-semibold text-accent">
                        {playerAddresses[currentPlayerIndex]?.slice(0, 6)}...
                        {playerAddresses[currentPlayerIndex]?.slice(-4)}
                      </span>{" "}
                      | Current Bet: <span className="font-semibold text-warning">{currentBet.toString()}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button className="btn btn-sm btn-ghost" onClick={() => refetchGameInfo()} title="Refresh game data">
                    🔄 Refresh
                  </button>
                  <button className="btn btn-sm btn-info" onClick={debugContract} title="Debug contract call">
                    🐛 Debug
                  </button>
                  <div className="text-right">
                    <p className="text-sm opacity-70">Pot</p>
                    <p className="text-2xl font-bold text-primary">{pot.toString()} chips</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Poker Table View */}
          <div className="card bg-base-200 shadow-2xl">
            <div className="card-body p-4">
              <PokerTable
                players={players}
                communityCards={communityCards}
                pot={pot}
                phase={phase}
                yourCards={{
                  card1Value: playerCards.card1Value,
                  card2Value: playerCards.card2Value,
                  isDecrypted: playerCards.isDecrypted,
                  isDecrypting: playerCards.isDecrypting,
                }}
              />

              {/* Card decryption status */}
              {phase >= 1 && phase < 4 && (
                <div className="mt-4 text-center">
                  {playerCards.isDecrypting && (
                    <div className="flex justify-center items-center gap-2">
                      <span className="loading loading-spinner loading-xs"></span>
                      <p className="text-sm">Decrypting your cards...</p>
                    </div>
                  )}
                  {playerCards.decryptError && <p className="text-error text-xs">{playerCards.decryptError}</p>}
                  {!playerCards.card1Handle && <p className="text-sm opacity-70">Waiting for cards to be dealt...</p>}
                  {playerCards.card1Handle && !playerCards.isDecrypted && !playerCards.isDecrypting && (
                    <p className="text-warning text-xs">⚠️ Cards encrypted. Auto-decrypting...</p>
                  )}
                </div>
              )}

              {phase === 0 && gameCreator && address?.toLowerCase() === gameCreator.toLowerCase() && (
                <div className="mt-8 flex flex-col items-center gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={handleStartGame}
                    disabled={isPending || isConfirming || playerCount < 2}
                  >
                    {isPending || isConfirming ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        Starting...
                      </>
                    ) : (
                      `Start Game (${playerCount}/6 players)`
                    )}
                  </button>
                  {playerCount < 2 && <p className="text-white text-sm">Need at least 2 players to start</p>}
                </div>
              )}

              {phase === 0 && gameCreator && address?.toLowerCase() !== gameCreator.toLowerCase() && (
                <div className="mt-8 flex justify-center">
                  <p className="text-white text-sm opacity-70">Waiting for game creator to start...</p>
                </div>
              )}

              {/* Action buttons with smart disable logic */}
              {phase >= 1 && phase < 3 && (
                <div className="mt-4 space-y-4">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {/* Fold button */}
                    <div className="tooltip" data-tip={availableActions.foldReason || "Give up this hand"}>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleAction(1)}
                        disabled={!availableActions.canFold || isPending || isConfirming}
                      >
                        🚫 Fold
                      </button>
                    </div>

                    {/* Check button */}
                    <div className="tooltip" data-tip={availableActions.checkReason || "Pass without betting"}>
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => handleAction(2)}
                        disabled={!availableActions.canCheck || isPending || isConfirming}
                      >
                        ✋ Check
                      </button>
                    </div>

                    {/* Call button */}
                    <div className="tooltip" data-tip={availableActions.callReason || "Match the current bet"}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleAction(3)}
                        disabled={!availableActions.canCall || isPending || isConfirming}
                      >
                        📞 Call
                        {availableActions.canCall && currentPlayer && (
                          <span className="ml-1">
                            ({(BigInt(currentBet) - BigInt(currentPlayer.currentBet)).toString()})
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Raise section */}
                  <div className="flex justify-center items-center gap-2">
                    <label className="text-sm font-semibold">Raise:</label>
                    <input
                      type="number"
                      value={raiseAmount}
                      onChange={e => setRaiseAmount(e.target.value)}
                      className="input input-bordered input-sm w-24"
                      placeholder="Amount"
                      min="10"
                      disabled={!availableActions.canRaise || isPending || isConfirming}
                    />
                    <div className="tooltip" data-tip={availableActions.raiseReason || "Increase the bet"}>
                      <button
                        className="btn btn-warning btn-sm"
                        onClick={() => handleAction(4, parseInt(raiseAmount))}
                        disabled={!availableActions.canRaise || isPending || isConfirming}
                      >
                        📈 Raise
                      </button>
                    </div>
                  </div>

                  {/* Turn indicator */}
                  {!currentPlayer?.isCurrentPlayer && (
                    <p className="text-center text-sm opacity-70">⏳ Waiting for other players...</p>
                  )}
                  {currentPlayer?.isCurrentPlayer && (
                    <p className="text-center text-sm font-bold text-accent animate-pulse">🎯 It&apos;s your turn!</p>
                  )}
                </div>
              )}

              {(isPending || isConfirming) && (
                <div className="mt-4 text-center">
                  <span className="loading loading-spinner loading-md text-white"></span>
                  <p className="text-white text-sm mt-2">
                    {isPending ? "Confirming transaction..." : "Waiting for confirmation..."}
                  </p>
                </div>
              )}

              {phase === 4 && (
                <div className="mt-4 text-center space-y-3">
                  <p className="text-white text-2xl font-bold">🎉 Game Finished!</p>
                  {winner && winner !== "0x0000000000000000000000000000000000000000" && (
                    <div className="bg-yellow-600 bg-opacity-30 rounded-lg p-4">
                      <p className="text-yellow-200 text-sm font-semibold">🏆 Winner</p>
                      <p className="text-white text-lg font-mono mt-1">
                        {winner.slice(0, 6)}...{winner.slice(-4)}
                      </p>
                      {address?.toLowerCase() === winner.toLowerCase() && (
                        <p className="text-yellow-300 text-sm mt-1 font-bold">🎊 Congratulations! You won!</p>
                      )}
                      <p className="text-yellow-200 text-sm mt-2">
                        Winnings: <span className="font-bold text-white">{winnings.toString()} chips</span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h4 className="font-bold mb-2">Players</h4>
              {playerAddresses.length > 0 ? (
                <div className="space-y-2">
                  {playerAddresses.map((addr, index) => (
                    <div
                      key={addr}
                      className={`flex justify-between items-center p-2 rounded ${
                        index === currentPlayerIndex && phase >= 1 && phase < 4
                          ? "bg-accent bg-opacity-20 border border-accent"
                          : "bg-base-300"
                      } ${playerFolded[index] ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        {index === currentPlayerIndex && phase >= 1 && phase < 4 && (
                          <span className="text-accent">👉</span>
                        )}
                        <span className="text-sm font-mono">
                          {addr.slice(0, 6)}...{addr.slice(-4)}
                        </span>
                        {addr.toLowerCase() === address?.toLowerCase() && (
                          <span className="badge badge-primary badge-sm">You</span>
                        )}
                        {playerFolded[index] && <span className="badge badge-error badge-sm">Folded</span>}
                      </div>
                      <div className="text-right text-sm">
                        <div>💰 {playerChips[index]?.toString() || "0"} chips</div>
                        {playerBets[index] && Number(playerBets[index]) > 0 && (
                          <div className="text-warning">Bet: {playerBets[index].toString()}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm opacity-70">No players yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

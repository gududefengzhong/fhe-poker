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
    const isPlayerInGame = playerAddresses.some(addr => addr.toLowerCase() === address?.toLowerCase());

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Top Bar - Game Info */}
      <div className="max-w-[1600px] mx-auto mb-4">
        <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-slate-700/50">
          {/* Left: Game Info */}
          <div className="flex items-center gap-6">
            <div>
              <h3 className="text-lg font-bold text-white">Game #{gameId}</h3>
              <p className="text-sm text-slate-400">
                {phaseNames[phase]} • {playerCount.toString()} Players
              </p>
            </div>
            {phase >= 1 && phase < 4 && playerAddresses.length > 0 && (
              <div className="hidden md:block border-l border-slate-700 pl-6">
                <p className="text-xs text-slate-500">Current Turn</p>
                <p className="text-sm font-semibold text-emerald-400">
                  {playerAddresses[currentPlayerIndex]?.slice(0, 6)}...
                  {playerAddresses[currentPlayerIndex]?.slice(-4)}
                </p>
              </div>
            )}
          </div>

          {/* Right: Pot */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-slate-500">Total Pot</p>
              <p className="text-2xl font-bold text-amber-400">{pot.toString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_auto_1fr] gap-4">
          {/* Left Sidebar - Action History */}
          <div className="order-2 lg:order-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
              <ActionHistory gameId={Number(gameId)} />
            </div>
          </div>

          {/* Dealer Avatar - Left of Table */}
          <div className="order-3 lg:order-2 hidden lg:block">
            <div className="sticky top-4">
              <DealerAvatar gameId={gameId} size="xl" showGreeting={false} />
            </div>
          </div>

          {/* Main Poker Table */}
          <div className="order-1 lg:order-3">
            <div
              className="relative bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 rounded-3xl shadow-2xl border-8 border-amber-900/30 overflow-hidden"
              style={{ minHeight: "600px" }}
            >
              {/* Poker Table Felt Texture */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                  backgroundSize: "40px 40px",
                }}
              ></div>

              <div className="relative p-8">
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
                      <div className="flex justify-center items-center gap-2 text-white">
                        <span className="loading loading-spinner loading-xs"></span>
                        <p className="text-sm">Decrypting your cards...</p>
                      </div>
                    )}
                    {playerCards.decryptError && <p className="text-error text-xs">{playerCards.decryptError}</p>}
                    {!playerCards.card1Handle && (
                      <p className="text-sm text-slate-300">Waiting for cards to be dealt...</p>
                    )}
                    {playerCards.card1Handle && !playerCards.isDecrypted && !playerCards.isDecrypting && (
                      <p className="text-warning text-xs">⚠️ Cards encrypted. Auto-decrypting...</p>
                    )}
                  </div>
                )}

                {phase === 0 && gameCreator && address?.toLowerCase() === gameCreator.toLowerCase() && (
                  <div className="mt-8 flex flex-col items-center gap-2">
                    <button
                      className="btn btn-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-lg"
                      onClick={handleStartGame}
                      disabled={isPending || isConfirming || playerCount < 2}
                    >
                      {isPending || isConfirming ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Starting...
                        </>
                      ) : (
                        `🎮 Start Game (${playerCount}/6 players)`
                      )}
                    </button>
                    {playerCount < 2 && <p className="text-amber-300 text-sm">⚠️ Need at least 2 players to start</p>}
                  </div>
                )}

                {phase === 0 && gameCreator && address?.toLowerCase() !== gameCreator.toLowerCase() && (
                  <div className="mt-8 flex justify-center">
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="loading loading-dots loading-sm"></span>
                      <p className="text-sm">Waiting for game creator to start...</p>
                    </div>
                  </div>
                )}

                {/* Action buttons with smart disable logic */}
                {phase >= 1 && phase < 3 && (
                  <div className="mt-8 space-y-4">
                    <div className="flex justify-center gap-3 flex-wrap">
                      {/* Fold button */}
                      <div className="tooltip" data-tip={availableActions.foldReason || "Give up this hand"}>
                        <button
                          className="btn btn-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg min-w-[120px]"
                          onClick={() => handleAction(1)}
                          disabled={!availableActions.canFold || isPending || isConfirming}
                        >
                          🚫 Fold
                        </button>
                      </div>

                      {/* Check button */}
                      <div className="tooltip" data-tip={availableActions.checkReason || "Pass without betting"}>
                        <button
                          className="btn btn-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg min-w-[120px]"
                          onClick={() => handleAction(2)}
                          disabled={!availableActions.canCheck || isPending || isConfirming}
                        >
                          ✋ Check
                        </button>
                      </div>

                      {/* Call button */}
                      <div className="tooltip" data-tip={availableActions.callReason || "Match the current bet"}>
                        <button
                          className="btn btn-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white border-0 shadow-lg min-w-[120px]"
                          onClick={() => handleAction(3)}
                          disabled={!availableActions.canCall || isPending || isConfirming}
                        >
                          📞 Call
                          {availableActions.canCall && currentPlayer && (
                            <span className="ml-1 text-xs">
                              ({(BigInt(currentBet) - BigInt(currentPlayer.currentBet)).toString()})
                            </span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Raise section */}
                    <div className="flex justify-center items-center gap-3 bg-slate-800/30 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                      <label className="text-sm font-semibold text-white">Raise Amount:</label>
                      <input
                        type="number"
                        value={raiseAmount}
                        onChange={e => setRaiseAmount(e.target.value)}
                        className="input input-bordered bg-slate-700/50 text-white border-slate-600 w-32"
                        placeholder="Amount"
                        min="10"
                        disabled={!availableActions.canRaise || isPending || isConfirming}
                      />
                      <div className="tooltip" data-tip={availableActions.raiseReason || "Increase the bet"}>
                        <button
                          className="btn btn-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white border-0 shadow-lg min-w-[120px]"
                          onClick={() => handleAction(4, parseInt(raiseAmount))}
                          disabled={!availableActions.canRaise || isPending || isConfirming}
                        >
                          📈 Raise
                        </button>
                      </div>
                    </div>

                    {/* Turn indicator */}
                    {!currentPlayer?.isCurrentPlayer && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-300">
                          <span className="loading loading-dots loading-sm"></span>
                          <p className="text-sm">Waiting for other players...</p>
                        </div>
                      </div>
                    )}
                    {currentPlayer?.isCurrentPlayer && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400 animate-pulse">🎯 It&apos;s your turn!</p>
                      </div>
                    )}
                  </div>
                )}

                {(isPending || isConfirming) && (
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="loading loading-spinner loading-md text-emerald-400"></span>
                      <p className="text-white text-sm">
                        {isPending ? "Confirming transaction..." : "Waiting for confirmation..."}
                      </p>
                    </div>
                  </div>
                )}

                {phase === 4 && (
                  <div className="mt-8 text-center space-y-4">
                    <p className="text-white text-3xl font-bold">🎉 Game Finished!</p>
                    {winner && winner !== "0x0000000000000000000000000000000000000000" && (
                      <div className="bg-gradient-to-r from-amber-600/30 to-yellow-600/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-amber-500/50 shadow-2xl">
                        <p className="text-amber-300 text-sm font-semibold uppercase tracking-wider">🏆 Winner</p>
                        <p className="text-white text-2xl font-mono mt-2">
                          {winner.slice(0, 6)}...{winner.slice(-4)}
                        </p>
                        {address?.toLowerCase() === winner.toLowerCase() && (
                          <p className="text-amber-200 text-lg mt-2 font-bold animate-bounce">
                            🎊 Congratulations! You won!
                          </p>
                        )}
                        <p className="text-amber-100 text-base mt-3">
                          Winnings: <span className="font-bold text-white text-xl">{winnings.toString()} chips</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect } from "react";
import { useDeployedContractInfo } from "./helper";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import type { AllowedChainIds } from "~~/utils/helper/networks";

interface UseGameEventsParams {
  chainId: AllowedChainIds | undefined;
  onGameCreated?: (gameId: bigint, creator: string) => void;
  onPlayerJoined?: (gameId: bigint, player: string, playerIndex: number) => void;
  onGameStarted?: (gameId: bigint, playerCount: number) => void;
  onPlayerAction?: (gameId: bigint, player: string, action: number, amount: bigint) => void;
  onPhaseChanged?: (gameId: bigint, newPhase: number) => void;
  onGameEnded?: (gameId: bigint, winner: string, winnings: bigint) => void;
}

/**
 * Hook to watch game contract events in real-time
 */
export const useGameEvents = (params: UseGameEventsParams) => {
  const { chainId, onGameCreated, onPlayerJoined, onGameStarted, onPlayerAction, onPhaseChanged, onGameEnded } = params;

  const publicClient = usePublicClient();

  // Get contract info
  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId,
  });

  // Watch GameCreated event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "GameCreated",
    onLogs: useCallback(
      (logs: any[]) => {
        console.log("📡 GameCreated event received, logs count:", logs.length);
        logs.forEach(log => {
          const { gameId, creator } = log.args;
          console.log("🎮 GameCreated event:", {
            gameId: gameId?.toString(),
            creator,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
          });
          onGameCreated?.(gameId, creator);
        });
      },
      [onGameCreated],
    ),
    onError: useCallback((error: Error) => {
      console.error("❌ GameCreated event error:", error);
    }, []),
  });

  // Watch PlayerJoined event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "PlayerJoined",
    onLogs: useCallback(
      (logs: any[]) => {
        logs.forEach(log => {
          const { gameId, player, playerIndex } = log.args;
          console.log("👥 PlayerJoined event:", { gameId: gameId?.toString(), player, playerIndex });
          onPlayerJoined?.(gameId, player, Number(playerIndex));
        });
      },
      [onPlayerJoined],
    ),
  });

  // Watch GameStarted event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "GameStarted",
    onLogs: useCallback(
      (logs: any[]) => {
        logs.forEach(log => {
          const { gameId, playerCount } = log.args;
          console.log("🚀 GameStarted event:", { gameId: gameId?.toString(), playerCount });
          onGameStarted?.(gameId, Number(playerCount));
        });
      },
      [onGameStarted],
    ),
  });

  // Watch PlayerAction event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "PlayerAction",
    onLogs: useCallback(
      (logs: any[]) => {
        logs.forEach(log => {
          const { gameId, player, action, amount } = log.args;
          console.log("🎯 PlayerAction event:", { gameId: gameId?.toString(), player, action, amount });
          onPlayerAction?.(gameId, player, Number(action), amount);
        });
      },
      [onPlayerAction],
    ),
  });

  // Watch PhaseChanged event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "PhaseChanged",
    onLogs: useCallback(
      (logs: any[]) => {
        logs.forEach(log => {
          const { gameId, newPhase } = log.args;
          console.log("🔄 PhaseChanged event:", { gameId: gameId?.toString(), newPhase });
          onPhaseChanged?.(gameId, Number(newPhase));
        });
      },
      [onPhaseChanged],
    ),
  });

  // Watch GameEnded event
  useWatchContractEvent({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    eventName: "GameEnded",
    onLogs: useCallback(
      (logs: any[]) => {
        logs.forEach(log => {
          const { gameId, winner, winnings } = log.args;
          console.log("🏆 GameEnded event:", { gameId: gameId?.toString(), winner, winnings });
          onGameEnded?.(gameId, winner, winnings);
        });
      },
      [onGameEnded],
    ),
  });

  return {
    contractAddress: contractInfo?.address,
    publicClient,
  };
};

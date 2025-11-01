"use client";

import { useCallback, useEffect, useState } from "react";
import type { Abi } from "viem";
import { useReadContract } from "wagmi";

// 游戏信息类型
export interface GameInfo {
  gameId: number;
  creator: string;
  phase: number;
  pot: number;
  currentBet: number;
  currentPlayerIndex: number;
  playerCount: number;
  communityCards: number[];
}

// 玩家信息类型
export interface PlayerInfo {
  addr: string;
  chips: number;
  isActive: boolean;
  hasFolded: boolean;
  currentBet: number;
}

// 操作历史条目
export interface ActionItem {
  id: string;
  player: string;
  action: string;
  amount?: number;
  timestamp: number;
  icon: string;
  color: string;
}

// LocalStorage 键名
const STORAGE_KEY_PREFIX = "fhe-poker-game-";
const ACTIONS_KEY_PREFIX = "fhe-poker-actions-";
const MAX_CACHED_ACTIONS = 50;

/**
 * 简化的游戏轮询 Hook
 *
 * 功能：
 * 1. 每 10 秒轮询一次游戏状态
 * 2. 使用 LocalStorage 缓存数据
 * 3. 页面刷新后恢复历史
 * 4. 简单可靠，Vercel 完全支持
 */
export function useGamePolling(
  gameId: number | undefined,
  contractAddress: `0x${string}` | undefined,
  contractAbi: Abi | undefined,
) {
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // LocalStorage 键名
  const gameStorageKey = gameId !== undefined ? `${STORAGE_KEY_PREFIX}${gameId}` : null;
  const actionsStorageKey = gameId !== undefined ? `${ACTIONS_KEY_PREFIX}${gameId}` : null;

  // ========================================
  // 1. 从 LocalStorage 加载缓存
  // ========================================
  const loadCachedData = useCallback(() => {
    if (!gameStorageKey || !actionsStorageKey) return;

    try {
      // 加载游戏信息
      const cachedGame = localStorage.getItem(gameStorageKey);
      if (cachedGame) {
        const data = JSON.parse(cachedGame);
        setGameInfo(data.gameInfo);
        setPlayers(data.players);
        setLastUpdate(data.timestamp);
      }

      // 加载操作历史
      const cachedActions = localStorage.getItem(actionsStorageKey);
      if (cachedActions) {
        setActions(JSON.parse(cachedActions));
      }
    } catch (error) {
      console.error("Failed to load cached data:", error);
    }
  }, [gameStorageKey, actionsStorageKey]);

  // ========================================
  // 2. 保存数据到 LocalStorage
  // ========================================
  const saveCachedData = useCallback(
    (gameInfo: GameInfo, players: PlayerInfo[]) => {
      if (!gameStorageKey) return;

      try {
        localStorage.setItem(
          gameStorageKey,
          JSON.stringify({
            gameInfo,
            players,
            timestamp: Date.now(),
          }),
        );
      } catch (error) {
        console.error("Failed to save cached data:", error);
      }
    },
    [gameStorageKey],
  );

  const saveActions = useCallback(
    (actions: ActionItem[]) => {
      if (!actionsStorageKey) return;

      try {
        // 只保存最近的 MAX_CACHED_ACTIONS 条
        const toCache = actions.slice(-MAX_CACHED_ACTIONS);
        localStorage.setItem(actionsStorageKey, JSON.stringify(toCache));
      } catch (error) {
        console.error("Failed to save actions:", error);
      }
    },
    [actionsStorageKey],
  );

  // ========================================
  // 3. 使用 Wagmi 读取合约数据
  // ========================================
  // 读取游戏基本信息
  const { data: gameInfoData, refetch: refetchGame } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getGameInfo",
    args: gameId !== undefined ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== undefined,
    },
  });

  // 读取游戏详细数据（包含 creator 等）
  const { data: gameData } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "games",
    args: gameId !== undefined ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== undefined,
    },
  });

  // 读取玩家信息
  const { data: playersData } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getPlayers",
    args: gameId !== undefined ? [BigInt(gameId)] : undefined,
    query: {
      enabled: gameId !== undefined,
    },
  });

  // ========================================
  // 4. 处理游戏数据更新
  // ========================================
  useEffect(() => {
    if (!gameInfoData || !gameData) return;

    try {
      // 解析 getGameInfo 返回的数据: (phase, playerCount, pot)
      const [phase, playerCount, pot] = gameInfoData as [number, number, bigint];

      // 解析 games 返回的数据: (gameId, phase, currentPlayerIndex, pot, currentBet, deckSeed, deckIndex, creator)
      const [, , currentPlayerIndex, , currentBet, , , creator] = gameData as [
        bigint,
        number,
        number,
        bigint,
        bigint,
        bigint,
        number,
        string,
      ];

      const newGameInfo: GameInfo = {
        gameId: gameId!,
        creator,
        phase: Number(phase),
        pot: Number(pot),
        currentBet: Number(currentBet),
        currentPlayerIndex: Number(currentPlayerIndex),
        playerCount: Number(playerCount),
        communityCards: [], // 简化版不显示公共牌
      };

      // 解析玩家数据
      let newPlayers: PlayerInfo[] = [];
      if (playersData) {
        const [playerAddrs, playerChips, playerBets, playerFolded, playerActive] = playersData as [
          string[],
          bigint[],
          bigint[],
          boolean[],
          boolean[],
        ];

        newPlayers = playerAddrs.map((addr, i) => ({
          addr,
          chips: Number(playerChips[i]),
          currentBet: Number(playerBets[i]),
          hasFolded: playerFolded[i],
          isActive: playerActive[i],
        }));
      }

      // 检测变化并生成操作历史
      if (gameInfo) {
        const newActions = detectChanges(gameInfo, newGameInfo, players, newPlayers);
        if (newActions.length > 0) {
          const updatedActions = [...actions, ...newActions];
          setActions(updatedActions);
          saveActions(updatedActions);
        }
      }

      setGameInfo(newGameInfo);
      setPlayers(newPlayers);
      saveCachedData(newGameInfo, newPlayers);
      setLastUpdate(Date.now());
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to process game data:", error);
      setIsLoading(false);
    }
  }, [gameInfoData, gameData, playersData, gameId]);

  // ========================================
  // 5. 检测变化并生成操作历史
  // ========================================
  const detectChanges = (
    oldGame: GameInfo,
    newGame: GameInfo,
    oldPlayers: PlayerInfo[],
    newPlayers: PlayerInfo[],
  ): ActionItem[] => {
    const changes: ActionItem[] = [];
    const timestamp = Date.now() / 1000;

    // 检测阶段变化
    if (oldGame.phase !== newGame.phase) {
      const phaseNames = ["Waiting", "PreFlop", "Flop", "Turn", "River", "Showdown", "Finished"];
      changes.push({
        id: `phase-${timestamp}`,
        player: "System",
        action: `Phase: ${phaseNames[newGame.phase]}`,
        timestamp,
        icon: "🔄",
        color: "text-purple-400",
      });
    }

    // 检测玩家数量变化（新玩家加入）
    if (newPlayers.length > oldPlayers.length) {
      const newPlayer = newPlayers[newPlayers.length - 1];
      changes.push({
        id: `join-${timestamp}`,
        player: newPlayer.addr,
        action: "joined the game",
        timestamp,
        icon: "👋",
        color: "text-green-400",
      });
    }

    // 检测玩家状态变化（弃牌）
    newPlayers.forEach((player, i) => {
      const oldPlayer = oldPlayers[i];
      if (oldPlayer && !oldPlayer.hasFolded && player.hasFolded) {
        changes.push({
          id: `fold-${i}-${timestamp}`,
          player: player.addr,
          action: "Fold",
          timestamp,
          icon: "🚫",
          color: "text-red-400",
        });
      }
    });

    // 检测下注变化
    newPlayers.forEach((player, i) => {
      const oldPlayer = oldPlayers[i];
      if (oldPlayer && player.currentBet > oldPlayer.currentBet) {
        const amount = player.currentBet - oldPlayer.currentBet;
        const action = player.currentBet === newGame.currentBet ? "Call" : "Raise";
        changes.push({
          id: `bet-${i}-${timestamp}`,
          player: player.addr,
          action: `${action} ${amount}`,
          amount,
          timestamp,
          icon: action === "Raise" ? "⬆️" : "✅",
          color: action === "Raise" ? "text-yellow-400" : "text-green-400",
        });
      }
    });

    return changes;
  };

  // ========================================
  // 6. 首次加载时从缓存恢复
  // ========================================
  useEffect(() => {
    if (gameId !== undefined) {
      loadCachedData();
    }
  }, [gameId, loadCachedData]);

  // ========================================
  // 7. 轮询机制（每 10 秒）
  // ========================================
  useEffect(() => {
    if (gameId === undefined) return;

    // 立即执行一次
    refetchGame();

    // 每 10 秒轮询一次
    const interval = setInterval(() => {
      refetchGame();
    }, 10000);

    return () => clearInterval(interval);
  }, [gameId, refetchGame]);

  // ========================================
  // 8. 手动刷新
  // ========================================
  const refresh = useCallback(() => {
    refetchGame();
  }, [refetchGame]);

  return {
    gameInfo,
    players,
    actions,
    isLoading,
    lastUpdate,
    refresh,
  };
}

"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { useWaitForTransactionReceipt } from "wagmi";

interface TransactionContextType {
  pendingTxHash: `0x${string}` | undefined;
  pendingAction: "create" | "join" | "start" | "playerAction" | null;
  pendingGameId: number | null; // 新增：记录正在操作的游戏 ID
  isConfirming: boolean;
  isConfirmed: boolean;
  setPendingTransaction: (
    hash: `0x${string}`,
    action: "create" | "join" | "start" | "playerAction",
    gameId?: number,
  ) => void;
  clearPendingTransaction: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | undefined>();
  const [pendingAction, setPendingAction] = useState<"create" | "join" | "start" | "playerAction" | null>(null);
  const [pendingGameId, setPendingGameId] = useState<number | null>(null);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
  });

  const setPendingTransaction = useCallback(
    (hash: `0x${string}`, action: "create" | "join" | "start" | "playerAction", gameId?: number) => {
      console.log("🔄 Setting pending transaction:", { hash, action, gameId });
      setPendingTxHash(hash);
      setPendingAction(action);
      setPendingGameId(gameId ?? null);
    },
    [],
  );

  const clearPendingTransaction = useCallback(() => {
    console.log("✅ Clearing pending transaction");
    setPendingTxHash(undefined);
    setPendingAction(null);
    setPendingGameId(null);
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        pendingTxHash,
        pendingAction,
        pendingGameId,
        isConfirming,
        isConfirmed,
        setPendingTransaction,
        clearPendingTransaction,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransaction must be used within a TransactionProvider");
  }
  return context;
}

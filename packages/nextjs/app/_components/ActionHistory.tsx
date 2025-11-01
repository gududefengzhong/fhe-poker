"use client";

import { useAccount } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { type ActionItem, useGamePolling } from "~~/hooks/useGamePolling";
import type { AllowedChainIds } from "~~/utils/helper/networks";

interface ActionHistoryProps {
  gameId: number;
}

export function ActionHistory({ gameId }: ActionHistoryProps) {
  const { chainId } = useAccount();
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;

  // Get contract info
  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId: allowedChainId,
  });

  // 使用简化的轮询 Hook
  const { actions, isLoading, lastUpdate } = useGamePolling(
    gameId,
    contractInfo?.address as `0x${string}` | undefined,
    contractInfo?.abi,
  );

  // 格式化时间
  const formatTime = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // 缩短地址
  const shortenAddress = (address: string) => {
    if (!address || address === "System") return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化最后更新时间
  const formatLastUpdate = () => {
    if (!lastUpdate) return "";
    const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
    if (seconds < 5) return "Just now";
    return `${seconds}s ago`;
  };

  return (
    <div className="h-full">
      <div className="p-4">
        <h4 className="font-bold text-sm flex items-center gap-2 text-white mb-3">
          <span>📜</span>
          <span>Action History</span>
          {isLoading && <span className="loading loading-spinner loading-xs text-emerald-400"></span>}
        </h4>
        {lastUpdate > 0 && <p className="text-[10px] text-slate-400 mb-2">Updated {formatLastUpdate()}</p>}
        <div className="h-px bg-slate-700/50 mb-3"></div>
        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
          {actions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">{isLoading ? "Loading..." : "No actions yet"}</p>
          ) : (
            actions
              .slice()
              .reverse()
              .map((action: ActionItem) => (
                <div
                  key={action.id}
                  className="flex items-start gap-2 text-xs bg-slate-700/30 rounded-lg p-2 hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-lg">{action.icon}</span>
                  <div className="flex-1">
                    <p className={`${action.color} font-medium`}>
                      {shortenAddress(action.player)} {action.action}
                    </p>
                    <p className="text-slate-400 text-[10px]">{formatTime(action.timestamp)}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

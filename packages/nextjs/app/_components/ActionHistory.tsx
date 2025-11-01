"use client";

import { useAccount } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { useGamePolling, type ActionItem } from "~~/hooks/useGamePolling";
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
    <div className="card bg-base-200 shadow-lg">
      <div className="card-body p-4">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <span>📜</span>
          <span>Action History</span>
          {isLoading && <span className="loading loading-spinner loading-xs"></span>}
        </h4>
        {lastUpdate > 0 && <p className="text-[10px] text-base-content/50">Updated {formatLastUpdate()}</p>}
        <div className="divider my-1"></div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {actions.length === 0 ? (
            <p className="text-xs text-base-content/50 text-center py-4">
              {isLoading ? "Loading..." : "No actions yet"}
            </p>
          ) : (
            actions
              .slice()
              .reverse()
              .map((action: ActionItem) => (
                <div key={action.id} className="flex items-start gap-2 text-xs">
                  <span className="text-lg">{action.icon}</span>
                  <div className="flex-1">
                    <p className={`${action.color} font-medium`}>
                      {shortenAddress(action.player)} {action.action}
                    </p>
                    <p className="text-base-content/50 text-[10px]">{formatTime(action.timestamp)}</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

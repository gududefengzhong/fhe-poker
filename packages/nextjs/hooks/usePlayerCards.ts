"use client";

import { useEffect, useMemo } from "react";
import { useDeployedContractInfo } from "./helper";
import { useWagmiEthers } from "./wagmi/useWagmiEthers";
import { FhevmInstance } from "fhevm-sdk";
import { useFHEDecrypt, useInMemoryStorage } from "fhevm-sdk";
import { useReadContract } from "wagmi";
import type { AllowedChainIds } from "~~/utils/helper/networks";

/**
 * Hook to fetch and decrypt player's hole cards
 */
export const usePlayerCards = (params: {
  instance: FhevmInstance | undefined;
  gameId: string | undefined;
  playerAddress: `0x${string}` | undefined;
  chainId: number | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, gameId, playerAddress, chainId, initialMockChains } = params;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { ethersSigner } = useWagmiEthers(initialMockChains);

  // Get contract info
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: contractInfo } = useDeployedContractInfo({
    contractName: "TexasHoldem",
    chainId: allowedChainId,
  });

  // Read encrypted cards from contract
  const {
    data: cardsData,
    isLoading: isLoadingCards,
    refetch: refetchCards,
  } = useReadContract({
    address: contractInfo?.address as `0x${string}` | undefined,
    abi: contractInfo?.abi,
    functionName: "getPlayerCards",
    args: gameId && playerAddress ? [BigInt(gameId), playerAddress] : undefined,
    query: {
      enabled: !!contractInfo?.address && !!gameId && !!playerAddress,
    },
  });

  // Parse encrypted card handles
  const { card1Handle, card2Handle } = useMemo(() => {
    if (!cardsData || !Array.isArray(cardsData)) {
      return { card1Handle: undefined, card2Handle: undefined };
    }
    return {
      card1Handle: cardsData[0] as string,
      card2Handle: cardsData[1] as string,
    };
  }, [cardsData]);

  // Prepare decryption requests
  const decryptRequests = useMemo(() => {
    if (!contractInfo?.address || !card1Handle || !card2Handle) return undefined;

    // Check if handles are valid (not zero hash)
    const zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (card1Handle === zeroHash || card2Handle === zeroHash) return undefined;

    return [
      { handle: card1Handle, contractAddress: contractInfo.address },
      { handle: card2Handle, contractAddress: contractInfo.address },
    ] as const;
  }, [contractInfo?.address, card1Handle, card2Handle]);

  // Debug: Log decryption prerequisites
  useEffect(() => {
    // Only log if we have card handles (meaning we're in a game)
    if (!card1Handle && !card2Handle) return;

    console.log("🔍 Decryption Prerequisites:", {
      hasInstance: !!instance,
      hasEthersSigner: !!ethersSigner,
      hasRequests: !!decryptRequests,
      requestsLength: decryptRequests?.length,
      card1Handle,
      card2Handle,
      playerAddress,
      gameId,
      contractAddress: contractInfo?.address,
    });

    if (!ethersSigner && card1Handle && card2Handle) {
      console.warn("⚠️ ethersSigner is not ready yet. Waiting for wallet connection...");
    }
    if (!instance && card1Handle && card2Handle) {
      console.warn("⚠️ FhevmInstance is not ready yet. Waiting for initialization...");
    }
  }, [instance, ethersSigner, decryptRequests, card1Handle, card2Handle, playerAddress, gameId, contractInfo?.address]);

  // Decrypt cards
  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decryptMessage,
    results: decryptResults,
    error: decryptError,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests: decryptRequests,
  });

  // Parse decrypted card values
  const { card1Value, card2Value } = useMemo(() => {
    if (!card1Handle || !card2Handle || !decryptResults) {
      return { card1Value: undefined, card2Value: undefined };
    }

    const card1 = decryptResults[card1Handle];
    const card2 = decryptResults[card2Handle];

    console.log("🃏 Parsing decrypted card values:", {
      card1Handle,
      card2Handle,
      card1FromResults: card1,
      card2FromResults: card2,
      decryptResultsKeys: Object.keys(decryptResults),
      hasCard1InResults: card1Handle in decryptResults,
      hasCard2InResults: card2Handle in decryptResults,
    });

    return {
      card1Value: card1 !== undefined ? Number(card1) : undefined,
      card2Value: card2 !== undefined ? Number(card2) : undefined,
    };
  }, [card1Handle, card2Handle, decryptResults]);

  const isDecrypted = card1Value !== undefined && card2Value !== undefined;

  console.log("🎴 Card values:", {
    card1Value,
    card2Value,
    isDecrypted,
    card1Handle,
    card2Handle,
  });

  // 自动解密：当有加密的牌且还未解密时，自动触发解密
  useEffect(() => {
    // Only proceed if we have card handles
    if (!card1Handle || !card2Handle) return;

    console.log("🔐 Auto-decrypt check:", {
      canDecrypt,
      isDecrypted,
      isDecrypting,
      hasCard1Handle: !!card1Handle,
      hasCard2Handle: !!card2Handle,
      hasInstance: !!instance,
      hasEthersSigner: !!ethersSigner,
      hasDecryptRequests: !!decryptRequests,
      decryptRequestsLength: decryptRequests?.length,
      card1Handle,
      card2Handle,
      contractAddress: contractInfo?.address,
      willDecrypt: canDecrypt && !isDecrypted && !isDecrypting,
      decryptMessage,
      decryptError,
    });

    // Only attempt decryption if all prerequisites are met
    if (canDecrypt && !isDecrypted && !isDecrypting) {
      console.log("🔓 Auto-decrypting player cards...");
      decrypt();
    } else if (!canDecrypt && !isDecrypted && !isDecrypting) {
      // Don't show warning if we're already decrypting or decrypted
      if (!instance) {
        console.log("⏳ Waiting for FHEVM instance to initialize...");
      } else if (!ethersSigner) {
        console.log("⏳ Waiting for wallet signer to be ready...");
      } else if (!decryptRequests) {
        console.warn(
          "⚠️ Decrypt requests are empty. card1Handle:",
          card1Handle,
          "card2Handle:",
          card2Handle,
          "contractAddress:",
          contractInfo?.address,
        );
      } else {
        console.warn("⚠️ Cannot decrypt cards. Check prerequisites above.");
      }
    } else if (isDecrypted) {
      console.log("✅ Cards already decrypted, skipping auto-decrypt");
    }
  }, [
    canDecrypt,
    isDecrypted,
    isDecrypting,
    card1Handle,
    card2Handle,
    instance,
    ethersSigner,
    decryptRequests,
    contractInfo?.address,
    decrypt,
    decryptMessage,
    decryptError,
  ]);

  return {
    // Card handles (encrypted)
    card1Handle,
    card2Handle,

    // Card values (decrypted)
    card1Value,
    card2Value,

    // Status
    isLoadingCards,
    isDecrypting,
    isDecrypted,
    canDecrypt,

    // Actions
    decrypt,
    refetchCards,

    // Messages
    decryptMessage,
    decryptError,
  };
};

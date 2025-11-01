import { useEffect, useMemo, useState } from "react";
import { FhevmInstance, useFHEDecrypt, useInMemoryStorage } from "fhevm-sdk";
import { ethers } from "ethers";
import { useReadContract } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/helper";

export const useShowdownCards = (params: {
  instance: FhevmInstance | undefined;
  gameId: string | undefined;
  chainId: number | undefined;
  phase: number;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, gameId, chainId, phase } = params;
  const { data: contractInfo } = useDeployedContractInfo("TexasHoldem");
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();

  // Only fetch in Showdown (3) or Finished (4) phase
  const shouldFetch = phase === 3 || phase === 4;

  // Get all players' cards from contract
  const { data: showdownData, refetch: refetchShowdownCards } = useReadContract({
    address: contractInfo?.address as `0x${string}`,
    abi: contractInfo?.abi,
    functionName: "getShowdownCards",
    args: gameId && shouldFetch ? [BigInt(gameId)] : undefined,
    query: {
      enabled: !!contractInfo && !!gameId && shouldFetch,
    },
  });

  const [playerAddresses, card1Handles, card2Handles] = (showdownData as
    | [readonly `0x${string}`[], readonly `0x${string}`[], readonly `0x${string}`[]]
    | undefined) || [undefined, undefined, undefined];

  // Prepare decryption requests for all cards
  const decryptRequests = useMemo(() => {
    if (!contractInfo?.address || !card1Handles || !card2Handles) return undefined;

    const requests: Array<{ handle: `0x${string}`; contractAddress: `0x${string}` }> = [];

    // Add all card1s
    card1Handles.forEach(handle => {
      requests.push({ handle, contractAddress: contractInfo.address as `0x${string}` });
    });

    // Add all card2s
    card2Handles.forEach(handle => {
      requests.push({ handle, contractAddress: contractInfo.address as `0x${string}` });
    });

    return requests;
  }, [contractInfo?.address, card1Handles, card2Handles]);

  // Create ethers signer
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);

  useEffect(() => {
    const setupSigner = async () => {
      if (typeof window === "undefined" || !window.ethereum) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
        const signer = await provider.getSigner();
        setEthersSigner(signer);
      } catch (error) {
        console.error("Error setting up signer:", error);
      }
    };

    setupSigner();
  }, []);

  // Decrypt all cards
  const { canDecrypt, decrypt, isDecrypting, results } = useFHEDecrypt({
    instance,
    ethersSigner,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests: decryptRequests,
  });

  // Parse decrypted results
  const playersCards = useMemo(() => {
    if (!playerAddresses || !card1Handles || !card2Handles || !results || Object.keys(results).length === 0)
      return undefined;

    const playerCount = playerAddresses.length;
    const cards: Array<{ address: string; card1: number | undefined; card2: number | undefined }> = [];

    for (let i = 0; i < playerCount; i++) {
      const card1Handle = card1Handles[i];
      const card2Handle = card2Handles[i];

      const card1Value = card1Handle ? results[card1Handle] : undefined;
      const card2Value = card2Handle ? results[card2Handle] : undefined;

      cards.push({
        address: playerAddresses[i],
        card1: typeof card1Value === "number" ? card1Value : undefined,
        card2: typeof card2Value === "number" ? card2Value : undefined,
      });
    }

    return cards;
  }, [playerAddresses, card1Handles, card2Handles, results]);

  const isDecrypted = !!playersCards && playersCards.every(p => p.card1 !== undefined && p.card2 !== undefined);

  return {
    playersCards,
    isLoadingCards: !showdownData && shouldFetch,
    isDecrypting,
    isDecrypted,
    canDecrypt,
    decrypt,
    refetchShowdownCards,
  };
};

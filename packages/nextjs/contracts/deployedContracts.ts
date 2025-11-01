/**
 * Deployed contract addresses and ABIs
 */
import { GenericContractsDeclaration } from "~~/utils/helper/contract";

const deployedContracts = {
  11155111: {
    TexasHoldem: {
      address: "0xB2Aa842c0fA0ec0227f2350d689415f4F33496bF",
      abi: [
        {
          inputs: [],
          name: "AlreadyFolded",
          type: "error",
        },
        {
          inputs: [],
          name: "GameAlreadyStarted",
          type: "error",
        },
        {
          inputs: [],
          name: "GameFull",
          type: "error",
        },
        {
          inputs: [],
          name: "GameNotFound",
          type: "error",
        },
        {
          inputs: [],
          name: "InsufficientChips",
          type: "error",
        },
        {
          inputs: [],
          name: "InvalidAction",
          type: "error",
        },
        {
          inputs: [],
          name: "NotEnoughPlayers",
          type: "error",
        },
        {
          inputs: [],
          name: "NotYourTurn",
          type: "error",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: true,
              internalType: "address",
              name: "creator",
              type: "address",
            },
          ],
          name: "GameCreated",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: true,
              internalType: "address",
              name: "winner",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint32",
              name: "winnings",
              type: "uint32",
            },
          ],
          name: "GameEnded",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "playerCount",
              type: "uint8",
            },
          ],
          name: "GameStarted",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: false,
              internalType: "enum TexasHoldem.GamePhase",
              name: "newPhase",
              type: "uint8",
            },
          ],
          name: "PhaseChanged",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "enum TexasHoldem.Action",
              name: "action",
              type: "uint8",
            },
            {
              indexed: false,
              internalType: "uint32",
              name: "amount",
              type: "uint32",
            },
          ],
          name: "PlayerAction",
          type: "event",
        },
        {
          anonymous: false,
          inputs: [
            {
              indexed: true,
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              indexed: true,
              internalType: "address",
              name: "player",
              type: "address",
            },
            {
              indexed: false,
              internalType: "uint8",
              name: "playerIndex",
              type: "uint8",
            },
          ],
          name: "PlayerJoined",
          type: "event",
        },
        {
          inputs: [],
          name: "BIG_BLIND",
          outputs: [
            {
              internalType: "uint32",
              name: "",
              type: "uint32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "INITIAL_CHIPS",
          outputs: [
            {
              internalType: "uint32",
              name: "",
              type: "uint32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "MAX_PLAYERS",
          outputs: [
            {
              internalType: "uint8",
              name: "",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "MIN_PLAYERS",
          outputs: [
            {
              internalType: "uint8",
              name: "",
              type: "uint8",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "SMALL_BLIND",
          outputs: [
            {
              internalType: "uint32",
              name: "",
              type: "uint32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [],
          name: "createGame",
          outputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "gameCounter",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          name: "games",
          outputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              internalType: "enum TexasHoldem.GamePhase",
              name: "phase",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "currentPlayerIndex",
              type: "uint8",
            },
            {
              internalType: "uint32",
              name: "pot",
              type: "uint32",
            },
            {
              internalType: "uint32",
              name: "currentBet",
              type: "uint32",
            },
            {
              internalType: "uint256",
              name: "deckSeed",
              type: "uint256",
            },
            {
              internalType: "uint8",
              name: "deckIndex",
              type: "uint8",
            },
            {
              internalType: "address",
              name: "creator",
              type: "address",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "getGameInfo",
          outputs: [
            {
              internalType: "enum TexasHoldem.GamePhase",
              name: "phase",
              type: "uint8",
            },
            {
              internalType: "uint8",
              name: "playerCount",
              type: "uint8",
            },
            {
              internalType: "uint32",
              name: "pot",
              type: "uint32",
            },
            {
              internalType: "uint8",
              name: "currentPlayerIndex",
              type: "uint8",
            },
            {
              internalType: "uint32",
              name: "currentBet",
              type: "uint32",
            },
            {
              internalType: "address",
              name: "creator",
              type: "address",
            },
            {
              internalType: "address",
              name: "winner",
              type: "address",
            },
            {
              internalType: "uint32",
              name: "winnings",
              type: "uint32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "getCommunityCards",
          outputs: [
            {
              internalType: "uint8[]",
              name: "",
              type: "uint8[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "getPlayers",
          outputs: [
            {
              internalType: "address[]",
              name: "playerAddrs",
              type: "address[]",
            },
            {
              internalType: "uint32[]",
              name: "playerChips",
              type: "uint32[]",
            },
            {
              internalType: "uint32[]",
              name: "playerBets",
              type: "uint32[]",
            },
            {
              internalType: "bool[]",
              name: "playerFolded",
              type: "bool[]",
            },
            {
              internalType: "bool[]",
              name: "playerActive",
              type: "bool[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "playerAddr",
              type: "address",
            },
          ],
          name: "getPlayerCards",
          outputs: [
            {
              internalType: "euint8",
              name: "card1",
              type: "bytes32",
            },
            {
              internalType: "euint8",
              name: "card2",
              type: "bytes32",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "getShowdownCards",
          outputs: [
            {
              internalType: "address[]",
              name: "playerAddresses",
              type: "address[]",
            },
            {
              internalType: "euint8[]",
              name: "card1s",
              type: "bytes32[]",
            },
            {
              internalType: "euint8[]",
              name: "card2s",
              type: "bytes32[]",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "joinGame",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
            {
              internalType: "enum TexasHoldem.Action",
              name: "action",
              type: "uint8",
            },
            {
              internalType: "uint32",
              name: "raiseAmount",
              type: "uint32",
            },
          ],
          name: "playerAction",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
        {
          inputs: [],
          name: "protocolId",
          outputs: [
            {
              internalType: "uint256",
              name: "",
              type: "uint256",
            },
          ],
          stateMutability: "pure",
          type: "function",
        },
        {
          inputs: [
            {
              internalType: "uint256",
              name: "gameId",
              type: "uint256",
            },
          ],
          name: "startGame",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ] as const,
    },
  },
} as const;

export default deployedContracts satisfies GenericContractsDeclaration;

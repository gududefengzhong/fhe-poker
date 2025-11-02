# 🎮 FHE Texas Hold'em Poker

> A privacy-preserving, fully on-chain Texas Hold'em poker game powered by Zama's fhEVM. Play poker with complete card privacy using Fully Homomorphic Encryption.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with Zama fhEVM](https://img.shields.io/badge/Built%20with-Zama%20fhEVM-blue)](https://www.zama.ai/fhevm)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

**🎯 GitHub About Description:**
```
Privacy-preserving on-chain poker using Zama's Fully Homomorphic Encryption (FHE). Your cards stay encrypted on-chain - no one can see them until showdown. Built with Next.js, Solidity, and fhEVM.
```

A privacy-preserving, fully on-chain Texas Hold'em poker game powered by [Zama's fhEVM](https://www.zama.ai/fhevm) (Fully Homomorphic Encryption Virtual Machine).

## 🎯 Project Overview

FHE Poker is a decentralized poker application that leverages cutting-edge Fully Homomorphic Encryption (FHE) technology to enable truly private and fair gameplay on the Ethereum blockchain. Unlike traditional blockchain poker games where card information can be exposed through transaction analysis or requires trusted third parties, FHE Poker keeps all sensitive game data encrypted throughout the entire game lifecycle—from card dealing to showdown.

### What Makes This Special?

- **🔐 Complete Privacy**: All hole cards remain encrypted on-chain using FHE. No player, observer, or even the blockchain validators can see hidden cards until showdown.
- **⚖️ Provable Fairness**: Smart contract logic guarantees fair gameplay without requiring trust in any centralized authority or random number oracle.
- **🎮 Real-time Gameplay**: Smooth user experience with optimistic UI updates, efficient state management, and responsive design.
- **💰 Trustless Settlement**: Automatic pot distribution and winner determination executed entirely by smart contracts.
- **🌐 Fully Decentralized**: Complete game logic runs on-chain with no centralized server dependencies.

## 🏗️ Technology Stack

### Blockchain & Smart Contracts
- **Blockchain**: Ethereum Sepolia Testnet
- **FHE Library**: Zama fhEVM (Fully Homomorphic Encryption Virtual Machine)
- **Smart Contracts**: Solidity 0.8.24
- **Development Framework**: Hardhat
- **Testing**: Hardhat + Chai

### Frontend
- **Framework**: Next.js 15.2.5 with App Router
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Web3 Integration**: wagmi 2.x + viem 2.x
- **Wallet Connection**: RainbowKit
- **State Management**: Zustand + React Query

### FHE SDK
- **Custom SDK**: TypeScript wrapper around Zama's relayer SDK
- **React Integration**: Custom hooks for encrypted operations
- **Storage**: IndexedDB for key caching
- **WASM Loading**: Automatic fallback mechanisms

## 🎲 How It Works

### Game Flow

1. **Join Game**: Players join by depositing the buy-in amount (100 tokens)
2. **Card Dealing**: Two hole cards are dealt to each player, encrypted using FHE
3. **Betting Rounds**: 
   - Pre-flop: After hole cards are dealt
   - Flop: After 3 community cards are revealed
   - Turn: After 4th community card
   - River: After 5th community card
4. **Showdown**: Winner is determined by comparing encrypted hands using FHE operations
5. **Pot Distribution**: Smart contract automatically distributes winnings to the winner

### FHE Implementation

The game leverages Zama's fhEVM to perform computations on encrypted data:

- **Encrypted Cards**: Each card is represented as an encrypted `euint8` value (0-51 representing a standard 52-card deck)
- **Private Hands**: Player hole cards remain encrypted on-chain until showdown
- **Secure Comparisons**: Hand rankings are compared using FHE comparison operations
- **Selective Decryption**: Only the winning hand is decrypted at showdown for verification
- **Access Control**: Zama's ACL (Access Control List) ensures only authorized players can decrypt their own cards

### Smart Contract Architecture

**PokerGame.sol** - Main game logic contract:
- Player management and turn handling
- Betting round state machine (PRE_FLOP → FLOP → TURN → RIVER → SHOWDOWN)
- Encrypted card dealing using FHE random number generation
- Hand evaluation and winner determination
- Pot management and automatic fund distribution

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (recommended: 20+)
- pnpm 9+
- MetaMask or compatible Web3 wallet
- Sepolia testnet ETH ([Get from faucet](https://sepoliafaucet.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/fhe-poker.git
cd fhe-poker

# Install dependencies
pnpm install

# Set up environment variables
cd packages/nextjs
cp .env.example .env.local
# Edit .env.local and add your Alchemy API key
# Get free API key at: https://dashboard.alchemy.com/

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to play!

### Environment Variables

Create `packages/nextjs/.env.local`:

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
```

### Deployment to Vercel

The project is configured for one-click deployment:

```bash
# Deploy to Vercel
./deploy.sh
```

**Important**: After deployment, configure environment variables in Vercel Dashboard:
- `NEXT_PUBLIC_ALCHEMY_API_KEY`: Your Alchemy API key

## 📝 Smart Contract Addresses

### Sepolia Testnet

Contract addresses are configured in `packages/nextjs/contracts/deployedContracts.ts`

- **PokerGame**: Deployed on Sepolia (check deployedContracts.ts)
- **ACL Contract**: Provided by Zama fhEVM infrastructure
- **KMS Contract**: Provided by Zama fhEVM infrastructure
- **Gateway Contract**: Provided by Zama fhEVM infrastructure

## 🎮 Game Rules

FHE Poker implements standard Texas Hold'em rules:

### Basic Rules
- **Players**: 2-9 players per table
- **Buy-in**: 100 tokens (configurable)
- **Blinds**: Small blind (10) and big blind (20)
- **Betting Rounds**: Pre-flop, Flop (3 cards), Turn (1 card), River (1 card)
- **Actions**: Check, Bet, Call, Raise, Fold
- **Hand Rankings**: Standard poker hand rankings (High Card → Royal Flush)
- **Showdown**: Best 5-card hand from 7 cards (2 hole + 5 community) wins

### Hand Rankings (Highest to Lowest)
1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

## 🔧 Development

### Project Structure

```
fhe-poker/
├── packages/
│   ├── hardhat/              # Smart contracts
│   │   ├── contracts/        # Solidity contracts
│   │   │   └── PokerGame.sol # Main game contract
│   │   ├── deploy/           # Deployment scripts
│   │   └── test/             # Contract tests
│   ├── nextjs/               # Frontend application
│   │   ├── app/              # Next.js app directory
│   │   │   ├── _components/  # Game UI components
│   │   │   └── page.tsx      # Main game page
│   │   ├── components/       # Shared React components
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── usePlayerCards.ts
│   │   │   ├── useGameEvents.ts
│   │   │   └── useGamePolling.ts
│   │   ├── contracts/        # Contract ABIs and addresses
│   │   └── public/           # Static assets
│   └── fhevm-sdk/            # FHE SDK wrapper
│       ├── src/              # SDK source code
│       │   ├── react/        # React hooks
│       │   └── internal/     # Core FHE logic
│       └── dist/             # Compiled SDK
├── deploy.sh                 # Vercel deployment script
├── vercel.json              # Vercel configuration
└── README.md                # This file
```

### Running Tests

```bash
# Run smart contract tests
cd packages/hardhat
pnpm test

# Run frontend in development mode
cd packages/nextjs
pnpm dev
```

### Building for Production

```bash
# Build all packages
pnpm install
pnpm --filter fhevm-sdk build
pnpm --filter nextjs build
```

## 🔒 Security Considerations

### FHE Security Guarantees
- **Encrypted State**: All sensitive game data (hole cards, bets) remain encrypted on-chain
- **No Information Leakage**: FHE operations prevent any information leakage through transaction analysis
- **Verifiable Randomness**: Card shuffling uses secure on-chain randomness provided by fhEVM

### Smart Contract Security
- **Access Control**: Only authorized players can perform game actions
- **State Machine**: Strict state transitions prevent invalid game states
- **Reentrancy Protection**: Standard reentrancy guards on fund transfers
- **Input Validation**: All user inputs are validated before processing

### Recommendations
- **Audit Required**: Smart contracts should undergo professional security audit before mainnet deployment
- **Testnet Only**: Current deployment is for demonstration purposes on Sepolia testnet
- **Key Management**: Users should secure their wallet private keys properly

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **[Zama](https://www.zama.ai/)**: For providing the groundbreaking fhEVM technology and infrastructure
- **[Scaffold-ETH](https://scaffoldeth.io/)**: For the excellent development framework inspiration
- **Ethereum Community**: For the robust Web3 ecosystem and tooling

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/gududefengzhong/fhe-poker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gududefengzhong)
- **Twitter**: [@yourhandle](https://x.com/rochestor_mu)

## 🚧 Roadmap

- [ ] Multi-table support
- [ ] Tournament mode
- [ ] Improved hand evaluation algorithm
- [ ] Mobile-responsive UI enhancements
- [ ] Mainnet deployment (after security audit)
- [ ] Integration with additional wallets
- [ ] Spectator mode
- [ ] Replay functionality

---

**⚠️ Disclaimer**: This is an experimental project demonstrating FHE technology in gaming. It is deployed on testnet for educational and demonstration purposes only. Do not use real funds or deploy to mainnet without proper security audits and legal compliance review.

**Built with ❤️ using Zama's fhEVM**


"use client";

import { useEffect, useState } from "react";

// Dealer avatar library - using emoji combinations for now
// In production, you could use actual images or AI-generated avatars
const DEALERS = [
  {
    id: 1,
    name: "Sophia",
    avatar: "👩‍💼",
    greeting: "Welcome to the table! Good luck!",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: 2,
    name: "Emma",
    avatar: "👩‍🦰",
    greeting: "Let's play some poker!",
    color: "from-purple-500 to-indigo-500",
  },
  {
    id: 3,
    name: "Olivia",
    avatar: "👱‍♀️",
    greeting: "May the best hand win!",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: 4,
    name: "Ava",
    avatar: "👩‍🦱",
    greeting: "Place your bets!",
    color: "from-green-500 to-emerald-500",
  },
  {
    id: 5,
    name: "Isabella",
    avatar: "👩",
    greeting: "Good luck at the table!",
    color: "from-yellow-500 to-orange-500",
  },
  {
    id: 6,
    name: "Mia",
    avatar: "👩‍🎤",
    greeting: "Let's deal some cards!",
    color: "from-red-500 to-pink-500",
  },
];

interface DealerAvatarProps {
  gameId?: string;
  size?: "sm" | "md" | "lg";
  showGreeting?: boolean;
}

export function DealerAvatar({ gameId, size = "md", showGreeting = true }: DealerAvatarProps) {
  const [dealer, setDealer] = useState(DEALERS[0]);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Select dealer based on gameId (deterministic) or random
    const index = gameId ? parseInt(gameId) % DEALERS.length : Math.floor(Math.random() * DEALERS.length);
    setDealer(DEALERS[index]);

    // Show greeting message
    if (showGreeting) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [gameId, showGreeting]);

  const sizeClasses = {
    sm: "w-16 h-16 text-3xl",
    md: "w-24 h-24 text-5xl",
    lg: "w-32 h-32 text-7xl",
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Dealer Avatar */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${dealer.color} flex items-center justify-center shadow-lg border-4 border-white`}
        >
          <span className="filter drop-shadow-lg">{dealer.avatar}</span>
        </div>
        {/* Online indicator */}
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
      </div>

      {/* Dealer Name */}
      <div className="text-center">
        <p className="font-bold text-white text-sm">{dealer.name}</p>
        <p className="text-xs text-white/70">Dealer</p>
      </div>

      {/* Greeting Message */}
      {showMessage && showGreeting && (
        <div className="relative mt-2">
          <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs">
            <p className="text-sm text-gray-800">{dealer.greeting}</p>
            {/* Speech bubble arrow */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export dealer list for other components
export { DEALERS };

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Dealer avatar library
const DEALERS = [
  {
    id: 1,
    name: "Yami",
    image: "/yami.jpg",
    greeting: "Welcome to the table! Good luck!",
    color: "from-pink-500 to-rose-500",
  },
];

interface DealerAvatarProps {
  gameId?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showGreeting?: boolean;
}

export function DealerAvatar({ size = "md", showGreeting = true }: DealerAvatarProps) {
  const [dealer] = useState(DEALERS[0]); // Always use Yami
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Show greeting message
    if (showGreeting) {
      setShowMessage(true);
      const timer = setTimeout(() => setShowMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showGreeting]);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-40 h-40",
    xl: "w-56 h-56",
  };

  const imageSizes = {
    sm: 64,
    md: 96,
    lg: 160,
    xl: 224,
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Dealer Avatar */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${dealer.color} flex items-center justify-center shadow-lg border-4 border-white overflow-hidden`}
        >
          <Image
            src={dealer.image}
            alt={dealer.name}
            width={imageSizes[size]}
            height={imageSizes[size]}
            className="object-cover w-full h-full"
            priority
          />
        </div>
        {/* Online indicator */}
        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-white"></div>
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

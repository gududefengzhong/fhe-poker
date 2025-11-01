interface CardProps {
  value?: number; // 0-51, or undefined for hidden card
  isHidden?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
}

export function Card({ value, isHidden = false, size = "md" }: CardProps) {
  const sizeClasses = {
    xs: "w-8 h-12 text-[0.5rem]",
    sm: "w-12 h-16 text-xs",
    md: "w-16 h-24 text-sm",
    lg: "w-20 h-28 text-base",
  };

  if (isHidden || value === undefined) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-400 flex items-center justify-center shadow-lg`}
      >
        <div className="text-white text-2xl">🂠</div>
      </div>
    );
  }

  const suits = ["♣", "♦", "♥", "♠"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  const rank = ranks[value % 13];
  const suit = suits[Math.floor(value / 13)];
  const isRed = suit === "♦" || suit === "♥";

  return (
    <div
      className={`${sizeClasses[size]} bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-between p-1 shadow-lg`}
    >
      <div className={`font-bold ${isRed ? "text-red-600" : "text-black"}`}>{rank}</div>
      <div className={`text-2xl ${isRed ? "text-red-600" : "text-black"}`}>{suit}</div>
      <div className={`font-bold ${isRed ? "text-red-600" : "text-black"}`}>{rank}</div>
    </div>
  );
}

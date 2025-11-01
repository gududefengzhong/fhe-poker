import { PokerGame } from "./_components/PokerGame";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 items-center w-full px-3 md:px-0 py-8">
      <PokerGame />
    </div>
  );
}

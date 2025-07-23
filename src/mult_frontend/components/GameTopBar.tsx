interface GameTopBarProps {
  turn: number;
  phase: number | string;
  R_Progress: number;
  A_Progress: number;
  players_num: number
}

export default function GameTopBar({
  turn,
  phase,
  R_Progress,
  A_Progress,
  players_num,
}: GameTopBarProps) {
  const left = 12 + players_num;
  const right = 6 + players_num;
  return (
    <div
        className="fixed top-0 left-0 right-0 z-50 w-full
        text-white flex items-center gap-4 shadow-xl shadow-black px-4"
    >
        <div className="text-lg font-semibold whitespace-nowrap px-2 py-2">
            Turn {turn} – {phase} : {R_Progress}/{left} vs {A_Progress}/{right}
            </div>

            {/* Checker board */}
            <div
                className="relative w-[500px] h-[120px] bg-contain
                        bg-no-repeat bg-center"
                style={{ backgroundImage: 'url(/background/checker.png)' }}
        ></div>
    </div>

  );
}

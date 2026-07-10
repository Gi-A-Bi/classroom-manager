import { parseSeat, seatKey, type SeatingResult } from "@/lib/tools/seating";

// 교탁 기준 좌석표 — 교사 결과 화면과 학생 현황판이 함께 쓴다.
export function SeatChart({ result }: { result: SeatingResult }) {
  const disabled = new Set(result.disabled);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg bg-gray-800 px-8 py-1.5 text-sm font-medium text-white">
        교탁 (칠판)
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: result.rows }, (_, r) => (
          <div key={r} className="flex justify-center gap-1.5">
            {Array.from({ length: result.cols }, (_, c) => {
              const key = seatKey(r, c);
              if (disabled.has(key)) {
                return <div key={key} className="h-14 w-16" aria-hidden />;
              }
              const seat = result.seats[key];
              return (
                <div
                  key={key}
                  className={`flex h-14 w-16 flex-col items-center justify-center rounded-lg border text-center ${
                    seat
                      ? "border-teal-200 bg-teal-50"
                      : "border-dashed bg-gray-50"
                  }`}
                >
                  {seat && (
                    <>
                      <span className="text-[10px] tabular-nums text-gray-400">
                        {seat.number}
                      </span>
                      <span className="text-sm font-medium leading-tight">
                        {seat.nickname}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 좌석 인접 관계 검사 (검증·표시용)
export function adjacentSeatKeys(a: string, b: string): boolean {
  const pa = parseSeat(a);
  const pb = parseSeat(b);
  return Math.abs(pa.r - pb.r) + Math.abs(pa.c - pb.c) === 1;
}

import { useEffect, useState } from "react";

interface SplashProps {
  onComplete: () => void;
}

// ローディング時間の定数
const LOADING_DURATION_MS = 2000;
const FADE_DURATION_MS = 500;
const LOADING_DURATION_S = LOADING_DURATION_MS / 1000;
const FADE_DURATION_S = FADE_DURATION_MS / 1000;

export function Splash({ onComplete }: SplashProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // ローディング完了後にフェードアウト開始
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, LOADING_DURATION_MS);

    // フェードアウトアニメーション完了後にコールバック実行
    const completeTimer = setTimeout(() => {
      onComplete();
    }, LOADING_DURATION_MS + FADE_DURATION_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#01151f] transition-opacity ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        transitionDuration: `${FADE_DURATION_S}s`,
      }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <img src="icon.svg" alt="" className="w-24 h-24" />
        </div>
        <div
          className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="読み込み中"
          aria-valuetext="読み込み中"
        >
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{
              animation: `progress ${LOADING_DURATION_S}s ease-out forwards`,
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

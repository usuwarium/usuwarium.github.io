import { useEffect, useState } from "react";

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 1秒後にフェードアウト開始
    const timer = setTimeout(() => {
      setFadeOut(true);
    }, 1000);

    // フェードアウトアニメーション完了後にコールバック実行
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1500); // 1秒表示 + 0.5秒フェードアウト

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#01151f] transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"
        }`}
    >
      <img
        src="logo.png"
        alt="Loading"
        className={`max-w-md w-full transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"
          }`}
      />
    </div>
  );
}

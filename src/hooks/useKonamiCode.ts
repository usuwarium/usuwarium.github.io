import { useEffect, useState } from "react";

const KONAMI_CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export function useKonamiCode(): boolean {
  const [triggered, setTriggered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const expectedKey = KONAMI_CODE[currentIndex].toLowerCase();

      if (key === expectedKey) {
        const newIndex = currentIndex + 1;

        if (newIndex === KONAMI_CODE.length) {
          setTriggered(true);
          setCurrentIndex(0);
        } else {
          setCurrentIndex(newIndex);
        }
      } else {
        setCurrentIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex]);

  return triggered;
}

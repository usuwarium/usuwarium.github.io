import { nanoid } from "nanoid";
import { useEffect, useRef, useState } from "react";

export interface RangeSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (value: number) => void; // 結局使ってないので消す
  onInput?: (value: number) => void;
  thumbSize?: number;
  color: string;
  backgroundColor?: string;
  className?: string;
}

export function RangeSlider(props: RangeSliderProps) {
  const {
    value,
    min,
    max,
    step,
    onChange,
    onInput,
    thumbSize = 12,
    color,
    backgroundColor = "#374151",
    className,
  } = props;
  const [name] = useState(nanoid(8));
  const rangeRef = useRef<HTMLInputElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [interactingValue, setInteractingValue] = useState(value);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setInteractingValue(newValue);
    onInput?.(newValue);
  };

  const handleInteractionStart = () => {
    setIsInteracting(true);
  };

  const handleInteractionend = () => {
    // 通常は onChange で操作終了を検知するが
    // 操作によっては onChange が発火しない場合があるため
    // 念のためここでも終了を検知する
    setTimeout(() => {
      setIsInteracting(false);
    }, 100);
  };

  useEffect(() => {
    const element = rangeRef.current;
    if (!element) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const newValue = Number(target.value);
      onChange?.(newValue);
      setIsInteracting(false);
    };

    element.addEventListener("change", handleChange);
    return () => element.removeEventListener("change", handleChange);
  }, [onChange]);

  const currentValue = isInteracting ? interactingValue : value;
  const percentage = ((currentValue - (min ?? 0)) / ((max ?? 100) - (min ?? 0))) * 100;
  return (
    <>
      <input
        ref={rangeRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onInput={handleInput}
        onMouseDown={handleInteractionStart}
        onTouchStart={handleInteractionStart}
        onMouseUp={handleInteractionend}
        onTouchEnd={handleInteractionend}
        className={`outline-none rounded-lg appearance-none cursor-pointer slider-${name} ${className}`}
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, ${backgroundColor} ${percentage}%, ${backgroundColor} 100%)`,
        }}
      />
      <style>{`
        .slider-${name}::-webkit-slider-thumb {
          appearance: none;
          width: ${thumbSize}px;
          height: ${thumbSize}px;
          border-radius: 50%;
          background: ${color};
          cursor: pointer;
        }
        .slider-${name}::-moz-range-thumb {
          width: ${thumbSize}px;
          height: ${thumbSize}px;
          border-radius: 50%;
          background: ${color};
          cursor: pointer;
          border: none;
        }
      `}</style>
    </>
  );
}

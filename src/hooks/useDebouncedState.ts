import { useEffect, useRef, useState } from "react";

export type UseDebouncedStateResult<T> = [T, (newValue: React.SetStateAction<T>) => void];

export function useDebouncedState<T>(
  defaultValue: T,
  wait: number,
  callback: (debouncedValue: T) => void
): UseDebouncedStateResult<T> {
  const [value, setValue] = useState(defaultValue);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      if (callbackRef.current) {
        callbackRef.current(value);
      }
      setValue(value);
    }, wait);
    return () => {
      window.clearTimeout(timerId!);
    };
  }, [value, wait]);

  return [value, setValue];
}

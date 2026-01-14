interface LoadingIconProps {
  size?: number;
}

export function LoadingIcon({ size = 10 }: LoadingIconProps) {
  return (
    <div className={`flex justify-center items-center h-${size}`}>
      <div
        className="w-6 h-6 rounded-full border-4 border-blue-500 animate-spin"
        style={{ borderTopColor: "transparent" }}
      />
    </div>
  );
}

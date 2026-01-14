import { FaSearch, FaTimes } from "react-icons/fa";

export function SearchInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const clear = () => {
    if (props.onChange) {
      const event = {
        ...new Event("change"),
        target: { value: "" },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      props.onChange(event);
    }
  };
  const className = props.className ? props.className : "";
  return (
    <div className={`relative ${className}`}>
      <input {...props} className="input-text px-7! h-9.5 w-full" />
      <FaSearch className="absolute inset-y-0 left-2 my-auto text-gray-400" />
      <button onClick={clear}>
        <FaTimes className="absolute inset-y-0 right-2 my-auto text-gray-400" />
      </button>
    </div>
  );
}

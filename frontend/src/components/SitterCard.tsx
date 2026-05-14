import { Sitter } from "../lib/api";

interface Props {
  sitter: Sitter;
  selected?: boolean;
  available?: boolean;
  onClick?: () => void;
}

export default function SitterCard({ sitter, selected, available, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border-2 p-4 transition-all ${
        selected
          ? "border-brand-500 bg-brand-50"
          : "border-gray-200 bg-white hover:border-brand-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">{sitter.name}</p>
          {sitter.bio && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sitter.bio}</p>
          )}
        </div>
        {available !== undefined && (
          <span
            className={`ml-3 shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
              available
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {available ? "Available" : "Booked"}
          </span>
        )}
      </div>
    </button>
  );
}

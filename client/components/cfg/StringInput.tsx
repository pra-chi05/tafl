import type { ContextFreeGrammar } from "@/types/cfg";
import { AlertCircle } from "lucide-react";

interface StringInputProps {
  value: string;
  onChange: (value: string) => void;
  grammar: ContextFreeGrammar | null;
}

export default function StringInput({
  value,
  onChange,
  grammar,
}: StringInputProps) {
  const getInvalidChars = (): string[] => {
    if (!grammar || !value) return [];
    return [...new Set([...value].filter((c) => !grammar.terminals.has(c)))];
  };

  const invalidChars = getInvalidChars();
  const hasError = invalidChars.length > 0;

  return (
    <div className="space-y-2">
      <label
        htmlFor="string-input"
        className="block text-sm font-semibold text-gray-800"
      >
        Input String
      </label>

      <input
        id="string-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          grammar
            ? `Use terminals: ${[...grammar.terminals].join(", ")}`
            : "Enter a grammar first…"
        }
        disabled={!grammar}
        className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-sm focus:outline-none transition ${
          !grammar
            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            : hasError
              ? "border-red-400 bg-red-50 focus:border-red-500"
              : value
                ? "border-green-400 bg-green-50 focus:border-green-500"
                : "border-gray-200 focus:border-indigo-400"
        }`}
      />

      {hasError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            Invalid character{invalidChars.length > 1 ? "s" : ""}: &quot;
            {invalidChars.join('", "')}&quot; — not in grammar terminals
          </span>
        </div>
      )}

      {grammar && !hasError && value && (
        <p className="text-xs text-green-600 font-medium">
          ✓ {value.length} character{value.length !== 1 ? "s" : ""} — all valid
          terminals
        </p>
      )}

      {!grammar && (
        <p className="text-xs text-gray-400">
          Enter a valid grammar above to enable string input
        </p>
      )}
    </div>
  );
}

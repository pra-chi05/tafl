import { useState, useCallback, useRef } from "react";
import { parseGrammar, getGrammarDescription } from "@/services/grammarParser";
import type { ContextFreeGrammar, ExampleGrammar } from "@/types/cfg";
import { AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";

// ─── Examples ─────────────────────────────────────────────────────────────

const EXAMPLES: ExampleGrammar[] = [
  {
    name: "aⁿbⁿ (balanced pairs)",
    grammar: "S → aSb | ε",
    testString: "aabb",
  },
  {
    name: "aⁿ (repeated a's)",
    grammar: "S → aS | a",
    testString: "aaaa",
  },
  {
    name: "Arithmetic Expressions",
    grammar: "E → E+T | T\nT → T*F | F\nF → (E) | id",
    testString: "id+id*id",
  },
  {
    name: "Palindromes over {a,b}",
    grammar: "S → aSa | bSb | a | b | ε",
    testString: "ababa",
  },
  {
    name: "Simple ambiguous grammar",
    grammar: "S → aS | Sa | a",
    testString: "aaa",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────

interface GrammarInputProps {
  onGrammarChange: (grammar: ContextFreeGrammar | null) => void;
  onTestStringChange?: (s: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function GrammarInput({
  onGrammarChange,
  onTestStringChange,
}: GrammarInputProps) {
  const [grammarText, setGrammarText] = useState("S → aSb | ε");
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(
    "1 production • 1 non-terminal • 2 terminals"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialise with default grammar
  const handleGrammarChange = useCallback(
    (text: string) => {
      setGrammarText(text);
      const { grammar, error: err } = parseGrammar(text);
      if (err) {
        setError(err);
        setDescription(null);
        onGrammarChange(null);
      } else if (grammar) {
        setError(null);
        setDescription(getGrammarDescription(grammar));
        onGrammarChange(grammar);
      }
    },
    [onGrammarChange]
  );

  // Pre-fill example
  const handleLoadExample = (ex: ExampleGrammar) => {
    handleGrammarChange(ex.grammar);
    onTestStringChange?.(ex.testString);
    setDropdownOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-800">
          Context-Free Grammar
        </label>
        {/* Examples dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            id="examples-btn"
          >
            Examples
            <ChevronDown
              className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex.name}
                    onClick={() => handleLoadExample(ex)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition group border-b border-gray-100 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-800 group-hover:text-indigo-700">
                      {ex.name}
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                      {ex.grammar.split("\n")[0]}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        id="grammar-input"
        value={grammarText}
        onChange={(e) => handleGrammarChange(e.target.value)}
        rows={4}
        placeholder={"S → aSb | ε\nA → aA | a"}
        className={`w-full px-4 py-3 border-2 rounded-xl font-mono text-sm focus:outline-none transition resize-none leading-relaxed ${
          error
            ? "border-red-400 bg-red-50 focus:border-red-500"
            : description
              ? "border-green-400 bg-green-50 focus:border-green-500"
              : "border-gray-200 focus:border-indigo-400"
        }`}
      />

      {/* Validation feedback */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      {description && !error && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-700 font-medium">{description}</p>
        </div>
      )}

      {/* Format hint */}
      <p className="text-xs text-gray-400">
        Supports{" "}
        <code className="bg-gray-100 px-1 rounded">→</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">-&gt;</code>, or{" "}
        <code className="bg-gray-100 px-1 rounded">::=</code>. Use{" "}
        <code className="bg-gray-100 px-1 rounded">|</code> for alternatives,{" "}
        <code className="bg-gray-100 px-1 rounded">ε</code> for epsilon.
      </p>
    </div>
  );
}

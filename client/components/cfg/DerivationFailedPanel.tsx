import { AlertCircle, AlertTriangle, Lightbulb, XCircle } from "lucide-react";
import type { ContextFreeGrammar, FailureReason } from "@/types/cfg";
import { analyzeFailure } from "@/services/failureAnalyzer";

interface DerivationFailedPanelProps {
  inputString: string;
  grammar: ContextFreeGrammar | null;
  failureReason?: FailureReason;
}

// ─── Dynamic language analysis ───────────────────────────────────────────

function getTakeaways(
  grammar: ContextFreeGrammar | null,
  reason: FailureReason,
  inputString: string
): string[] {
  const items: string[] = [];

  if (!grammar) {
    items.push("Enter a valid grammar to see a detailed diagnosis.");
    return items;
  }

  const terminals = [...grammar.terminals];
  const hasEpsilon = grammar.productions.some(
    (p) => p.lhs === grammar.startSymbol && p.rhs.length === 0
  );
  const hasSelfEmbedding = grammar.productions.some(
    (p) =>
      p.lhs === grammar.startSymbol &&
      p.rhs.length >= 3 &&
      p.rhs.includes(grammar.startSymbol)
  );

  // Explain the language
  if (hasSelfEmbedding && terminals.length >= 2 && hasEpsilon) {
    const [a, b] = terminals;
    items.push(
      `This grammar generates the language { ${a}ⁿ${b}ⁿ | n ≥ 0 } — strings where every "${a}" is balanced by a "${b}" on the right.`
    );
    items.push(
      `Your input "${inputString}" has ${[...inputString].filter((c) => c === a).length} "${a}"(s) and ${[...inputString].filter((c) => c === b).length} "${b}"(s). Only equal counts produce a derivation.`
    );
  } else if (terminals.length === 1) {
    const [t] = terminals;
    items.push(
      `This grammar generates only strings of "${t}"s. Every valid string looks like "${t.repeat(1)}", "${t.repeat(2)}", "${t.repeat(3)}", etc.`
    );
  } else if (terminals.some((t) => ["+", "*", "(", ")"].includes(t))) {
    items.push(
      `This grammar generates arithmetic expressions. The input must follow the proper operator-precedence structure it encodes.`
    );
  } else {
    items.push(
      `This grammar generates a context-free language over the terminal set { ${terminals.join(", ")} }.`
    );
  }

  // Explain the specific failure
  if (reason.type === "missing_terminals") {
    items.push(
      `Character(s) "${(reason.missing ?? []).join('", "')}" don't exist in the grammar — they're not part of the alphabet.`
    );
    items.push(
      `Allowed terminals are: ${terminals.length > 0 ? terminals.join(", ") : "(none)"}.`
    );
  } else if (reason.type === "infinite_loop") {
    items.push(
      `The grammar is non-productive: at least one non-terminal can never reach a purely terminal string. Add a base case.`
    );
    items.push(
      `Example fix: add "${grammar.startSymbol} → ε" or "${grammar.startSymbol} → ${terminals[0] ?? "a"}" to give a termination condition.`
    );
  } else {
    items.push(
      `The string "${inputString}" was searched via BFS up to depth 15 with no match — it is not in this language.`
    );
    if (hasEpsilon) {
      items.push(`The empty string ε is accepted by this grammar.`);
    }
    items.push(
      `Try modifying the grammar to include this string, or try a different input that fits the grammar's pattern.`
    );
  }

  return items;
}

// ─── Partial BFS trace for Block 2 ───────────────────────────────────────

interface PartialStep {
  form: string;
  label: string;
  status: "valid" | "diverged" | "failed";
}

function getPartialTrace(
  grammar: ContextFreeGrammar | null,
  inputString: string,
  reason: FailureReason
): PartialStep[] {
  if (!grammar) return [];

  const steps: PartialStep[] = [
    {
      form: grammar.startSymbol,
      label: "Start symbol",
      status: "valid",
    },
  ];

  // Find the first applicable production for the start symbol
  const firstProd = grammar.productions.find(
    (p) => p.lhs === grammar.startSymbol
  );
  if (firstProd) {
    const expanded =
      firstProd.rhs.length === 0 ? "ε" : firstProd.rhs.join("");
    steps.push({
      form: expanded,
      label: `Apply ${grammar.startSymbol} → ${expanded}  (first available rule)`,
      status: "valid",
    });

    // Second expansion if available
    const hasNT = firstProd.rhs.some((s) => grammar.nonTerminals.has(s));
    if (hasNT && steps.length < 4) {
      const nextProd = grammar.productions.find((p) =>
        firstProd.rhs.some((s) => s === p.lhs)
      );
      if (nextProd) {
        const expand2 =
          nextProd.rhs.length === 0 ? "ε" : nextProd.rhs.join("");
        const form2 = firstProd.rhs
          .map((s) => (s === nextProd.lhs ? expand2 : s))
          .join("");
        steps.push({
          form: form2,
          label: `Apply ${nextProd.lhs} → ${expand2}`,
          status: "valid",
        });
      }
    }
  }

  // Add the "diverged" step
  if (reason.type === "missing_terminals") {
    steps.push({
      form: inputString,
      label: `"${inputString}" contains unknown terminals`,
      status: "failed",
    });
  } else {
    steps.push({
      form: "…",
      label: "BFS expansion continues but target is never reached",
      status: "diverged",
    });
    steps.push({
      form: `"${inputString}"`,
      label: "Target string not found in the language",
      status: "failed",
    });
  }

  return steps;
}

// ─── Status colors ────────────────────────────────────────────────────────

const STATUS_CLASSES = {
  valid: {
    border: "border-green-300",
    bg: "bg-green-50",
    text: "text-green-800",
    badge: "bg-green-100 text-green-800",
    icon: <AlertCircle className="w-4 h-4 text-green-600" />,
  },
  diverged: {
    border: "border-orange-300",
    bg: "bg-orange-50",
    text: "text-orange-800",
    badge: "bg-orange-100 text-orange-800",
    icon: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  },
  failed: {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-800",
    badge: "bg-red-100 text-red-800",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
};

// ─── Component ────────────────────────────────────────────────────────────

export default function DerivationFailedPanel({
  inputString,
  grammar,
  failureReason,
}: DerivationFailedPanelProps) {
  const reason =
    failureReason ??
    (grammar
      ? analyzeFailure(grammar, inputString)
      : {
          type: "invalid_grammar" as const,
          message: "No valid grammar provided.",
          suggestion: "Enter a valid grammar first.",
        });

  const partialTrace = getPartialTrace(grammar, inputString, reason);
  const takeaways = getTakeaways(grammar, reason, inputString);

  return (
    <div className="space-y-6">
      {/* ── Block 1: Status Card ────────────────────────────── */}
      <div className="border-l-4 border-red-500 bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-red-900">
              Derivation Failed
            </h3>
            <p className="text-sm text-red-700 leading-relaxed">
              {reason.message}
            </p>
            <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700">
                <span className="font-semibold">Suggestion: </span>
                {reason.suggestion}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Block 2: Partial Derivation Trace ───────────────── */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Derivation Trace
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Showing what happens when we try to derive{" "}
            <span className="font-mono bg-gray-100 px-1 rounded">
              "{inputString || "ε"}"
            </span>
          </p>
        </div>

        <div className="space-y-1">
          {partialTrace.map((step, idx) => {
            const cls = STATUS_CLASSES[step.status];
            const isLast = idx === partialTrace.length - 1;
            return (
              <div key={idx}>
                <div
                  className={`flex items-center gap-3 border-2 ${cls.border} ${cls.bg} rounded-xl p-3`}
                >
                  <div className="flex-shrink-0">{cls.icon}</div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`font-mono font-bold text-sm ${cls.text}`}
                    >
                      {step.form}
                    </span>
                    <p className={`text-xs mt-0.5 ${cls.text} opacity-80`}>
                      {step.label}
                    </p>
                  </div>
                </div>
                {!isLast && (
                  <div className="flex justify-center py-1">
                    <div className="w-0.5 h-4 bg-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Block 3: Takeaways ──────────────────────────────── */}
      <div className="border-l-4 border-blue-500 bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-blue-900">
              Key Takeaways
            </h3>
            <ul className="space-y-2">
              {takeaways.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold mt-0.5">•</span>
                  <span className="text-xs text-blue-800 leading-relaxed">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

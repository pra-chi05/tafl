import type { ActiveView } from "@/types/cfg";
import { InfoIcon } from "lucide-react";

interface ExplanationPanelProps {
  activeView: ActiveView;
  isAmbiguous?: boolean;
}

const EXPLANATIONS: Record<
  string,
  { title: string; description: string; tip?: string }
> = {
  leftmost: {
    title: "Leftmost Derivation",
    description:
      "At every step, we expand the leftmost non-terminal in the current sentential form. This mirrors top-down (LL) parsing — the order a recursive-descent parser would follow.",
    tip: "Leftmost derivations correspond to parse trees read left-to-right at each level.",
  },
  rightmost: {
    title: "Rightmost Derivation (Canonical)",
    description:
      "At every step, we expand the rightmost non-terminal. This is the canonical form used in bottom-up (LR) parsers and underlies most real-world compiler front-ends.",
    tip: "Reading a rightmost derivation bottom-up gives the shift-reduce sequence of an LR parser.",
  },
  tree: {
    title: "Parse Tree (Syntax Tree)",
    description:
      "The parse tree shows the hierarchical structure of the derivation. Internal nodes are non-terminals; leaves are terminals. Both leftmost and rightmost derivations produce the same tree for an unambiguous grammar.",
    tip: "Hover over any node to highlight the path from the root to that node.",
  },
  none: {
    title: "Grammar Information",
    description:
      "Enter a grammar and string, then click Derive to see step-by-step leftmost and rightmost derivations plus the parse tree.",
    tip: "Non-terminals appear in bold indigo; terminals in gray; highlighted symbols have a yellow background.",
  },
};

export default function ExplanationPanel({
  activeView,
  isAmbiguous,
}: ExplanationPanelProps) {
  const key = activeView ?? "none";
  const info = EXPLANATIONS[key] ?? EXPLANATIONS["none"];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-2">
        <InfoIcon className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-blue-900">{info.title}</h4>
          <p className="text-xs text-blue-800 leading-relaxed">
            {info.description}
          </p>
          {info.tip && (
            <p className="text-xs text-blue-600 italic">{info.tip}</p>
          )}
        </div>
      </div>

      {/* Ambiguity notice */}
      {isAmbiguous && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">⚠ Ambiguous grammar detected:</span>{" "}
          The leftmost and rightmost derivations produce different parse trees,
          meaning this grammar is ambiguous — multiple parse trees exist for the
          given string.
        </div>
      )}

      {/* Color guide */}
      <div className="border-t border-blue-200 pt-2 flex flex-wrap gap-3 text-xs text-blue-700">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-indigo-500 inline-block" />
          Non-terminals
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-500 inline-block" />
          Terminals
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-300 inline-block" />
          Highlighted
        </div>
      </div>
    </div>
  );
}

import { useState, useCallback } from "react";
import GrammarInput from "@/components/cfg/GrammarInput";
import StringInput from "@/components/cfg/StringInput";
import DerivationPanel from "@/components/cfg/DerivationPanel";
import ParseTreePanel from "@/components/cfg/ParseTreePanel";
import ToggleBar from "@/components/cfg/ToggleBar";
import ExplanationPanel from "@/components/cfg/ExplanationPanel";
import DerivationFailedPanel from "@/components/cfg/DerivationFailedPanel";
import { performDerivation } from "@/services/derivationEngine";
import type {
  ContextFreeGrammar,
  ActiveView,
  DerivationResult,
} from "@/types/cfg";
import { Play, RotateCcw, Zap } from "lucide-react";

// ─── Empty State ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4 shadow-inner">
        <Zap className="w-10 h-10 text-indigo-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Ready to derive!
      </h3>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        Enter a grammar on the left, type a string, and hit{" "}
        <strong>Derive</strong> to see step-by-step derivations and parse tree.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 text-left w-full max-w-sm">
        {[
          {
            step: "1",
            title: "Enter grammar",
            desc: 'e.g., S → aSb | ε',
          },
          {
            step: "2",
            title: "Type a string",
            desc: 'e.g., "aabb"',
          },
          {
            step: "3",
            title: "Click Derive",
            desc: "See leftmost, rightmost, and parse tree",
          },
        ].map((item) => (
          <div key={item.step} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {item.step}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Index() {
  const [grammar, setGrammar] = useState<ContextFreeGrammar | null>(null);
  const [inputString, setInputString] = useState("");
  const [result, setResult] = useState<DerivationResult | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDerive = useCallback(() => {
    if (!grammar || inputString === "") return;

    setIsLoading(true);
    // Small timeout to allow the UI to show "Deriving…"
    setTimeout(() => {
      try {
        const derivationResult = performDerivation(grammar, inputString);
        setResult(derivationResult);
        if (derivationResult.success) {
          setActiveView("leftmost");
        } else {
          setActiveView(null);
        }
      } finally {
        setIsLoading(false);
      }
    }, 40);
  }, [grammar, inputString]);

  const handleReset = () => {
    setResult(null);
    setActiveView(null);
    setInputString("");
  };

  const hasValidInput =
    grammar !== null &&
    inputString !== "" &&
    [...inputString].every((c) => grammar.terminals.has(c));

  const renderPanel = () => {
    if (!result) return <EmptyState />;

    if (!result.success) {
      return (
        <DerivationFailedPanel
          inputString={inputString}
          grammar={grammar}
          failureReason={result.failureReason}
        />
      );
    }

    switch (activeView) {
      case "leftmost":
        return result.leftmostSteps ? (
          <DerivationPanel
            steps={result.leftmostSteps}
            type="leftmost"
            grammar={grammar!}
          />
        ) : null;
      case "rightmost":
        return result.rightmostSteps ? (
          <DerivationPanel
            steps={result.rightmostSteps}
            type="rightmost"
            grammar={grammar!}
          />
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">
            No rightmost derivation found within limits.
          </div>
        );
      case "tree":
        return result.parseTree ? (
          <ParseTreePanel tree={result.parseTree} />
        ) : null;
      default:
        return (
          <div className="py-8 text-center text-sm text-gray-500">
            Select a view above to explore the derivation.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
              <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                CFG Derivation Visualizer
              </h1>
              <p className="text-xs text-gray-500">
                Interactive context-free grammar derivation &amp; parse tree
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Layout ─────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[35%_1fr] gap-0 lg:gap-6">

          {/* ── LEFT PANEL ─────────────────────────────────── */}
          <div className="space-y-4 lg:border-r lg:border-gray-200 lg:pr-6">

            {/* Grammar input */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <GrammarInput
                onGrammarChange={setGrammar}
                onTestStringChange={setInputString}
              />
            </div>

            {/* String input */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <StringInput
                value={inputString}
                onChange={setInputString}
                grammar={grammar}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                id="derive-btn"
                onClick={handleDerive}
                disabled={!hasValidInput || isLoading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  !hasValidInput || isLoading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700"
                }`}
              >
                <Play className="w-4 h-4" />
                {isLoading ? "Deriving…" : "Derive"}
              </button>

              <button
                onClick={handleReset}
                disabled={!result && inputString === ""}
                className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                  !result && inputString === ""
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>

            {/* Result badge */}
            {result && result.success && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm text-emerald-700">
                <span className="text-emerald-500 font-bold">✓</span>
                <span className="font-medium">Derivation found!</span>
                {result.isAmbiguous && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Ambiguous
                  </span>
                )}
              </div>
            )}

            {/* Explanation */}
            <ExplanationPanel
              activeView={activeView}
              isAmbiguous={result?.isAmbiguous}
            />
          </div>

          {/* ── RIGHT PANEL ────────────────────────────────── */}
          <div className="space-y-4 lg:pl-0 mt-4 lg:mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-h-[400px]">
              {/* ToggleBar — shown only when derivation succeeded */}
              {result?.success && (
                <ToggleBar
                  activeView={activeView}
                  onViewChange={setActiveView}
                  hasDerivation={!!result?.success}
                />
              )}
              {renderPanel()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

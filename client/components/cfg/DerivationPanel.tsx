import { useState, useEffect, useRef, useCallback } from "react";
import type { DerivationStep, DerivationType, ContextFreeGrammar } from "@/types/cfg";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";

interface DerivationPanelProps {
  steps: DerivationStep[];
  type: DerivationType;
  grammar: ContextFreeGrammar;
}

// ─── Symbol Token Component ───────────────────────────────────────────────

function SymbolToken({
  symbol,
  isHighlighted,
  isNonTerminal,
}: {
  symbol: string;
  isHighlighted: boolean;
  isNonTerminal: boolean;
}) {
  if (symbol === "ε") {
    return (
      <span className="italic text-gray-400 font-mono text-lg">ε</span>
    );
  }

  return (
    <span
      className={`
        font-mono text-lg px-0.5 rounded transition-all duration-200
        ${isHighlighted ? "bg-yellow-200 text-yellow-900 font-bold ring-1 ring-yellow-400" : ""}
        ${!isHighlighted && isNonTerminal ? "text-indigo-600 font-bold" : ""}
        ${!isHighlighted && !isNonTerminal ? "text-gray-700" : ""}
      `}
    >
      {symbol}
    </span>
  );
}

// ─── Step Card Component ──────────────────────────────────────────────────

function StepCard({
  step,
  isCurrent,
  isLast,
  grammar,
  onClick,
}: {
  step: DerivationStep;
  isCurrent: boolean;
  isLast: boolean;
  grammar: ContextFreeGrammar;
  onClick: () => void;
}) {
  const isStart = step.stepNumber === 0;

  const cardClass = isStart
    ? "bg-blue-50 border-blue-300"
    : isLast
      ? "bg-emerald-50 border-emerald-300"
      : "bg-white border-gray-200";

  const headerClass = isStart
    ? "text-blue-800"
    : isLast
      ? "text-emerald-800"
      : "text-gray-800";

  return (
    <div
      onClick={onClick}
      className={`
        border-2 rounded-xl p-3 mb-2 cursor-pointer transition-all duration-200
        ${cardClass}
        ${isCurrent ? "ring-2 ring-indigo-400 shadow-md" : "hover:shadow-sm opacity-70 hover:opacity-100"}
      `}
    >
      {/* Header */}
      <div className={`text-xs font-semibold mb-2 ${headerClass}`}>
        {isStart
          ? "Step 0 — Start Symbol"
          : isLast
            ? `Step ${step.stepNumber} — Derivation Complete ✓`
            : `Step ${step.stepNumber} — Apply ${step.appliedRule.lhs} → ${step.appliedRule.rhs.length === 0 ? "ε" : step.appliedRule.rhs.join("")}`}
      </div>

      {/* Sentential form */}
      <div className="flex flex-wrap gap-0 items-center font-mono text-sm leading-loose py-1">
        {step.sententialForm.length === 0 ? (
          <span className="italic text-gray-400">ε (empty string)</span>
        ) : (
          step.sententialForm.map((sym, idx) => (
            <SymbolToken
              key={`${idx}-${sym}`}
              symbol={sym}
              isHighlighted={step.replacedIndex === idx}
              isNonTerminal={grammar.nonTerminals.has(sym)}
            />
          ))
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
        {step.description}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function DerivationPanel({
  steps,
  type,
  grammar,
}: DerivationPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when steps change
  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, [steps, type]);

  // Auto-play
  const advance = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= steps.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [steps.length]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(advance, 800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, advance]);

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No derivation available
      </div>
    );
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Arrow chain string
  const arrowChain = steps
    .map((s) =>
      s.sententialForm.length === 0
        ? "ε"
        : s.sententialForm.join("")
    )
    .join(" ⇒ ");

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="space-y-2">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap font-medium">
            {currentStep + 1} / {steps.length}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCurrentStep(0);
              setIsPlaying(false);
            }}
            title="Reset to start"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={isFirstStep}
            className={`p-2 rounded-lg transition ${isFirstStep ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={isLastStep && !isPlaying}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium text-sm transition ${
              isPlaying
                ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
            id={`play-pause-${type}`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Play
              </>
            )}
          </button>
          <button
            onClick={() =>
              setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
            }
            disabled={isLastStep}
            className={`p-2 rounded-lg transition ${isLastStep ? "bg-gray-100 text-gray-300 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current step card */}
      <div>
        <StepCard
          step={steps[currentStep]}
          isCurrent
          isLast={isLastStep}
          grammar={grammar}
          onClick={() => {}}
        />
      </div>

      {/* Final success badge */}
      {isLastStep && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              String successfully derived in {steps.length - 1} step
              {steps.length - 1 !== 1 ? "s" : ""}!
            </p>
          </div>
        </div>
      )}

      {/* Derivation chain */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Full derivation sequence
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 overflow-x-auto">
          <p className="font-mono text-sm text-gray-700 whitespace-nowrap">
            {arrowChain}
          </p>
        </div>
      </div>

      {/* Clickable mini step list */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          All steps
        </p>
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
          {steps.map((s, idx) => (
            <StepCard
              key={idx}
              step={s}
              isCurrent={idx === currentStep}
              isLast={idx === steps.length - 1}
              grammar={grammar}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

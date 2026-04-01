import type { ActiveView } from "@/types/cfg";
import { GitBranch, AlignLeft, AlignRight } from "lucide-react";

interface ToggleBarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  hasDerivation: boolean;
}

const views = [
  {
    id: "leftmost" as const,
    label: "Leftmost",
    fullLabel: "Leftmost Derivation",
    icon: AlignLeft,
  },
  {
    id: "rightmost" as const,
    label: "Rightmost",
    fullLabel: "Rightmost Derivation",
    icon: AlignRight,
  },
  {
    id: "tree" as const,
    label: "Parse Tree",
    fullLabel: "Parse Tree",
    icon: GitBranch,
  },
];

export default function ToggleBar({
  activeView,
  onViewChange,
  hasDerivation,
}: ToggleBarProps) {
  return (
    <div
      className="flex gap-1.5 p-1 bg-gray-100 rounded-xl mb-4"
      role="tablist"
      aria-label="Derivation view selector"
    >
      {views.map((view) => {
        const isActive = activeView === view.id;
        const Icon = view.icon;
        const disabled = !hasDerivation;

        return (
          <button
            key={view.id}
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${view.id}`}
            onClick={() => onViewChange(isActive ? null : view.id)}
            disabled={disabled}
            title={view.fullLabel}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : disabled
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{view.label}</span>
            <span className="sm:hidden">{view.label.split(" ")[0]}</span>
          </button>
        );
      })}
    </div>
  );
}

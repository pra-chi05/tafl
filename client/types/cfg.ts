// ─── Core Grammar Types ────────────────────────────────────────────────────

export interface Production {
  lhs: string;
  rhs: string[]; // array of symbols; empty array = epsilon
}

export interface ContextFreeGrammar {
  startSymbol: string;
  productions: Production[];
  nonTerminals: Set<string>;
  terminals: Set<string>;
}

// ─── Derivation Step ──────────────────────────────────────────────────────

export interface DerivationStep {
  stepNumber: number;
  sententialForm: string[]; // array of symbols
  appliedRule: Production;
  replacedIndex: number; // index in sententialForm of the replaced NT
  description: string;
}

// ─── Parse Tree ───────────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  symbol: string;
  children: TreeNode[];
  isTerminal: boolean;
}

// ─── View / Result Types ─────────────────────────────────────────────────

export type DerivationType = "leftmost" | "rightmost";
export type ActiveView = DerivationType | "tree" | null;

export interface FailureReason {
  type:
    | "missing_terminals"
    | "infinite_loop"
    | "no_derivation_path"
    | "invalid_grammar";
  message: string;
  suggestion: string;
  missing?: string[];
}

export interface DerivationResult {
  success: boolean;
  leftmostSteps?: DerivationStep[];
  rightmostSteps?: DerivationStep[];
  parseTree?: TreeNode;
  isAmbiguous?: boolean;
  failureReason?: FailureReason;
  error?: string;
}

// ─── Example Grammar ──────────────────────────────────────────────────────

export interface ExampleGrammar {
  name: string;
  grammar: string;
  testString: string;
}

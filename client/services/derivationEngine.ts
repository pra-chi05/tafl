import type {
  ContextFreeGrammar,
  DerivationStep,
  DerivationResult,
  TreeNode,
  DerivationType,
  Production,
} from "@/types/cfg";
import { analyzeFailure } from "@/services/failureAnalyzer";


// ─── Constants ────────────────────────────────────────────────────────────

const MAX_DEPTH = 15;
const MAX_QUEUE = 10_000;

// ─── BFS State ───────────────────────────────────────────────────────────

interface BFSState {
  form: string[]; // current sentential form as an array of symbols
  steps: DerivationStep[];
}

// ─── Utilities ────────────────────────────────────────────────────────────

function formKey(form: string[]): string {
  return form.join("\x00");
}

function isAllTerminals(
  form: string[],
  nonTerminals: Set<string>
): boolean {
  return form.every((s) => !nonTerminals.has(s) && s !== "ε");
}

function formToString(form: string[]): string {
  return form.filter((s) => s !== "ε").join("");
}

// ─── Core BFS ─────────────────────────────────────────────────────────────

function findDerivation(
  grammar: ContextFreeGrammar,
  target: string,
  type: DerivationType
): DerivationStep[] | null {
  const startForm = [grammar.startSymbol];
  const targetForm = target === "" ? [] : target.split("");

  // Trivial: start symbol IS the target (epsilon grammar)
  if (target === "" && grammar.startSymbol === "") return [];

  const initial: BFSState = {
    form: startForm,
    steps: [
      {
        stepNumber: 0,
        sententialForm: startForm,
        appliedRule: { lhs: grammar.startSymbol, rhs: [] },
        replacedIndex: -1,
        description: `We begin with the start symbol ${grammar.startSymbol}`,
      },
    ],
  };

  const visited = new Set<string>([formKey(startForm)]);
  const queue: BFSState[] = [initial];
  let queueProcessed = 0;

  while (queue.length > 0) {
    if (queueProcessed >= MAX_QUEUE) return null;
    const state = queue.shift()!;
    queueProcessed++;

    const { form, steps } = state;

    // Depth limit
    if (steps.length > MAX_DEPTH + 1) continue;

    // Find the target NT to expand
    let targetIdx = -1;
    if (type === "leftmost") {
      targetIdx = form.findIndex((s) => grammar.nonTerminals.has(s));
    } else {
      for (let i = form.length - 1; i >= 0; i--) {
        if (grammar.nonTerminals.has(form[i])) {
          targetIdx = i;
          break;
        }
      }
    }

    if (targetIdx === -1) {
      // No NT left — check if it matches the target
      const produced = formToString(form);
      if (produced === target) return steps;
      continue; // prune
    }

    const nt = form[targetIdx];
    const applicable = grammar.productions.filter((p) => p.lhs === nt);

    for (const prod of applicable) {
      // Build new form
      const newForm: string[] = [
        ...form.slice(0, targetIdx),
        ...(prod.rhs.length === 0 ? [] : prod.rhs), // epsilon = remove NT
        ...form.slice(targetIdx + 1),
      ];

      const key = formKey(newForm);
      if (visited.has(key)) continue;

      // Prune: all terminals + doesn't match target
      if (isAllTerminals(newForm, grammar.nonTerminals)) {
        const produced = formToString(newForm);
        if (produced === target) {
          // Found!
          const rule = `${prod.lhs} → ${prod.rhs.length === 0 ? "ε" : prod.rhs.join("")}`;
          const newStep: DerivationStep = {
            stepNumber: steps.length,
            sententialForm: newForm,
            appliedRule: prod,
            replacedIndex: targetIdx,
            description: `Replace ${nt} (${type === "leftmost" ? "leftmost" : "rightmost"}) using ${rule}`,
          };
          return [...steps, newStep];
        }
        continue; // wrong terminal string → prune
      }

      // Prune: form is too long
      if (newForm.filter((s) => s !== "ε").length > target.length + 2) continue;

      visited.add(key);

      const rule = `${prod.lhs} → ${prod.rhs.length === 0 ? "ε" : prod.rhs.join("")}`;
      const newStep: DerivationStep = {
        stepNumber: steps.length,
        sententialForm: newForm,
        appliedRule: prod,
        replacedIndex: targetIdx,
        description: `Replace ${nt} (${type === "leftmost" ? "leftmost" : "rightmost"}) using ${rule}`,
      };

      queue.push({ form: newForm, steps: [...steps, newStep] });
    }
  }

  return null;
}

// ─── Parse Tree Builder ───────────────────────────────────────────────────

let _nodeIdCounter = 0;

function buildParseTree(steps: DerivationStep[]): TreeNode {
  _nodeIdCounter = 0;

  // Start root
  const root: TreeNode = {
    id: `node-${_nodeIdCounter++}`,
    symbol: steps[0].sententialForm[0],
    children: [],
    isTerminal: false,
  };

  if (steps.length <= 1) return root;

  // We'll use a sequential expansion model keyed on leftmost-derivation order.
  // Each step tells us: at replacedIndex in the current sentential form, expand
  // the NT with appliedRule.rhs. We walk the tree in the same order.

  // Keep a flat "expansion queue" — NTs not yet expanded, in derivation order.
  const expansionQueue: TreeNode[] = [root];

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const { appliedRule } = step;

    // The next NT to expand in the tree (leftmost order)
    const nodeToExpand = expansionQueue.shift();
    if (!nodeToExpand) break;

    if (appliedRule.rhs.length === 0) {
      // Epsilon production
      nodeToExpand.children = [
        {
          id: `node-${_nodeIdCounter++}`,
          symbol: "ε",
          children: [],
          isTerminal: true,
        },
      ];
    } else {
      nodeToExpand.children = appliedRule.rhs.map((sym) => {
        const child: TreeNode = {
          id: `node-${_nodeIdCounter++}`,
          symbol: sym,
          children: [],
          isTerminal: true, // set below
        };
        return child;
      });

      // Push new NTs into the expansion queue (in left-to-right order)
      // We need to know the grammar to tell NT from T, but we don't have it here.
      // Use a convention: nodes marked isTerminal=true initially; caller fixes.
      // Actually we need the grammar — let's accept it as a parameter.
    }
  }

  return root;
}

function buildParseTreeWithGrammar(
  steps: DerivationStep[],
  grammar: ContextFreeGrammar
): TreeNode {
  _nodeIdCounter = 0;

  if (steps.length === 0) {
    return {
      id: `node-${_nodeIdCounter++}`,
      symbol: grammar.startSymbol,
      children: [],
      isTerminal: grammar.terminals.has(grammar.startSymbol),
    };
  }

  const root: TreeNode = {
    id: `node-${_nodeIdCounter++}`,
    symbol: grammar.startSymbol,
    children: [],
    isTerminal: false,
  };

  if (steps.length <= 1) return root;

  const expansionQueue: TreeNode[] = [root];

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const { appliedRule } = step;

    const nodeToExpand = expansionQueue.shift();
    if (!nodeToExpand) break;

    if (appliedRule.rhs.length === 0) {
      nodeToExpand.children = [
        {
          id: `node-${_nodeIdCounter++}`,
          symbol: "ε",
          children: [],
          isTerminal: true,
        },
      ];
    } else {
      nodeToExpand.children = appliedRule.rhs.map((sym) => {
        const isNT = grammar.nonTerminals.has(sym);
        const child: TreeNode = {
          id: `node-${_nodeIdCounter++}`,
          symbol: sym,
          children: [],
          isTerminal: !isNT,
        };
        if (isNT) expansionQueue.push(child);
        return child;
      });
    }
  }

  return root;
}

// ─── Ambiguity check ─────────────────────────────────────────────────────
// Two derivations are for the same string. Build their trees and compare
// structure (since LM and RM trees must be identical for unambiguous grammars).

function treeStructureKey(node: TreeNode): string {
  if (node.children.length === 0) return node.symbol;
  return `(${node.symbol}:${node.children.map(treeStructureKey).join(",")})`;
}

// ─── Public API ───────────────────────────────────────────────────────────

export function performDerivation(
  grammar: ContextFreeGrammar,
  targetString: string
): DerivationResult {
  // Validate chars in target against grammar terminals
  for (const char of targetString) {
    if (!grammar.terminals.has(char)) {
      const missing = [...targetString].filter(
        (c) => !grammar.terminals.has(c)
      );
      return {
        success: false,
        failureReason: {
          type: "missing_terminals",
          message: `Character(s) "${[...new Set(missing)].join('", "')}" are not terminals in this grammar.`,
          suggestion: `Ensure your input only uses: ${[...grammar.terminals].join(", ")}`,
          missing: [...new Set(missing)],
        },
      };
    }
  }

  const leftmostSteps = findDerivation(grammar, targetString, "leftmost");
  const rightmostSteps = findDerivation(grammar, targetString, "rightmost");

  if (!leftmostSteps) {
    return {
      success: false,
      failureReason: analyzeFailure(grammar, targetString),
    };
  }

  const parseTree = buildParseTreeWithGrammar(leftmostSteps, grammar);

  // Ambiguity: compare tree structures from LM and RM derivations
  let isAmbiguous = false;
  if (rightmostSteps) {
    const rmTree = buildParseTreeWithGrammar(rightmostSteps, grammar);
    isAmbiguous =
      treeStructureKey(parseTree) !== treeStructureKey(rmTree);
  }

  return {
    success: true,
    leftmostSteps,
    rightmostSteps: rightmostSteps ?? undefined,
    parseTree,
    isAmbiguous,
  };
}

export { findDerivation, buildParseTreeWithGrammar, treeStructureKey };

// Suppress unused warning
void buildParseTree;

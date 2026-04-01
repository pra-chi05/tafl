import type { ContextFreeGrammar, Production } from "@/types/cfg";

// ─── Tokenizer ────────────────────────────────────────────────────────────
// Splits an RHS string into an ordered list of symbols (NTs + terminals).
// Uppercase-letter sequences followed by optional lowercase/digits/primes
// are treated as NonTerminals. Everything else is a terminal character.
//
// Examples:
//   "aSb"   → ["a", "S", "b"]
//   "E+T"   → ["E", "+", "T"]
//   "T*F"   → ["T", "*", "F"]
//   "(E)"   → ["(", "E", ")"]
//   "id"    → ["i", "d"]    (lowercase → terminals)
//   "id+id" → ["id", "+", "id"]  — BUT only if "id" is a known NT
//
// Strategy: greedily consume the longest known multi-char NT starting at pos.
// Fall back to single-character terminal otherwise.

export function tokenizeRhs(
  rhs: string,
  nonTerminals: Set<string>
): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < rhs.length) {
    const ch = rhs[i];

    // Skip whitespace
    if (ch === " " || ch === "\t") { i++; continue; }

    // Epsilon literal
    if (ch === "ε" || rhs.startsWith("epsilon", i) || rhs.startsWith("eps", i)) {
      tokens.push("ε");
      if (ch === "ε") i++;
      else if (rhs.startsWith("epsilon", i)) i += 7;
      else i += 3;
      continue;
    }

    // Try to match a known multi-char non-terminal (e.g. "id", "E'")
    // Must start with uppercase letter for canonical NTs,
    // OR be a known NT (handles "id" as a terminal sequence unless declared NT)
    if (/[A-Z]/.test(ch)) {
      // Collect contiguous alphanumerics / underscores / primes
      let j = i + 1;
      while (j < rhs.length && /[A-Za-z0-9_']/.test(rhs[j])) j++;
      const candidate = rhs.slice(i, j);

      // Check if the full word is a known NT; if so, use it whole
      if (nonTerminals.has(candidate)) {
        tokens.push(candidate);
        i = j;
        continue;
      }

      // Otherwise emit character-by-character (fallback)
      tokens.push(ch);
      i++;
      continue;
    }

    // Try to match a known multi-char lowercase NT (e.g., "id")
    if (/[a-z]/.test(ch)) {
      let j = i + 1;
      while (j < rhs.length && /[A-Za-z0-9_']/.test(rhs[j])) j++;
      const candidate = rhs.slice(i, j);
      if (nonTerminals.has(candidate)) {
        tokens.push(candidate);
        i = j;
        continue;
      }
      // Single lowercase char = terminal
      tokens.push(ch);
      i++;
      continue;
    }

    // Everything else: single terminal character
    tokens.push(ch);
    i++;
  }

  return tokens;
}

// ─── First-pass NT collector ──────────────────────────────────────────────
// Scan all LHS strings to collect the full set of NonTerminals before
// we tokenize any RHS (so "id" won't be split if "id" is a declared NT).
function collectNonTerminals(lines: string[]): Set<string> {
  const nts = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_']*)\s*(?:→|->|::=)\s*/);
    if (m) nts.add(m[1]);
  }
  return nts;
}

// ─── Main parser ──────────────────────────────────────────────────────────

export function parseGrammar(rawInput: string): {
  grammar: ContextFreeGrammar | null;
  error: string | null;
} {
  try {
    // Normalise arrows (all variants → →)
    const normalised = rawInput
      .replace(/::=/g, "→")
      .replace(/->/g, "→");

    const lines = normalised
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && !l.startsWith("//"));

    if (lines.length === 0) {
      return { grammar: null, error: "Grammar cannot be empty" };
    }

    // First pass: collect NonTerminals from LHS only
    const nonTerminals = collectNonTerminals(lines);

    if (nonTerminals.size === 0) {
      return {
        grammar: null,
        error: 'No valid production rules found. Expected format: S → aSb | ε',
      };
    }

    const terminals = new Set<string>();
    const productions: Production[] = [];
    let startSymbol = "";

    for (const line of lines) {
      const arrowIdx = line.indexOf("→");
      if (arrowIdx === -1) {
        return {
          grammar: null,
          error: `Invalid production rule: "${line}". Expected format: S → aSb | ε`,
        };
      }

      const lhs = line.slice(0, arrowIdx).trim();
      const rhsText = line.slice(arrowIdx + 1).trim();

      if (!lhs || !nonTerminals.has(lhs)) {
        return {
          grammar: null,
          error: `Invalid left-hand side: "${lhs}"`,
        };
      }

      if (!startSymbol) startSymbol = lhs;

      // Split by | but respect parentheses (simple split for now)
      const alternatives = rhsText.split("|").map((a) => a.trim());

      for (const alt of alternatives) {
        if (!alt || alt === "ε" || alt === "epsilon" || alt === "eps") {
          productions.push({ lhs, rhs: [] }); // epsilon
        } else {
          const symbols = tokenizeRhs(alt, nonTerminals);
          productions.push({ lhs, rhs: symbols });

          // Collect terminals
          for (const sym of symbols) {
            if (sym !== "ε" && !nonTerminals.has(sym)) {
              terminals.add(sym);
            }
          }
        }
      }
    }

    if (productions.length === 0) {
      return { grammar: null, error: "No valid productions found" };
    }

    return {
      grammar: {
        startSymbol,
        productions,
        terminals,
        nonTerminals,
      },
      error: null,
    };
  } catch (err) {
    return {
      grammar: null,
      error: `Failed to parse grammar: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

// ─── Grammar description helper ───────────────────────────────────────────

export function getGrammarDescription(grammar: ContextFreeGrammar): string {
  const p = grammar.productions.length;
  const nt = grammar.nonTerminals.size;
  const t = grammar.terminals.size;
  return `${p} production${p !== 1 ? "s" : ""} • ${nt} non-terminal${nt !== 1 ? "s" : ""} • ${t} terminal${t !== 1 ? "s" : ""}`;
}

# ⚡ CFG Derivation Visualizer

An interactive, production-ready visualizer for **Context-Free Grammar (CFG)** derivations — built with React, TypeScript, and Vite.

Step through leftmost and rightmost derivations one rule at a time, inspect the parse tree, and instantly understand why a string fails to derive.

---

## ✨ Features

- **Universal grammar parser** — supports `→`, `->`, and `::=` arrow styles; handles `|` alternatives and `ε` epsilon automatically
- **BFS derivation engine** — finds both leftmost and rightmost derivations via breadth-first search (depth limit 15, queue limit 10 000)
- **Animated step-through** — Play / Pause / Previous / Next controls with 800 ms auto-advance
- **Color-coded step cards** — start (blue), expanding (white), complete (emerald), with the replaced symbol highlighted in yellow
- **Full derivation chain** — shows `S ⇒ aSb ⇒ aaSbb ⇒ … ⇒ aabb` sequence at a glance
- **Interactive parse tree** — SVG render with zoom (+/−), pan (drag), and hover path-highlighting
- **Ambiguity detection** — flags grammars where leftmost and rightmost derivations produce different parse trees
- **Smart failure panel** — 3-block diagnosis (status, partial trace, takeaways) dynamically tailored to the grammar and input
- **5 built-in examples** — loaded via dropdown, pre-filling both grammar and test string
- **Fully responsive** — single-column on mobile, 35 / 65 split on desktop

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # preview the production build locally
```

### Type-check

```bash
npm run typecheck
```

---

## 📝 Grammar Format

Each production goes on its own line. Alternatives are separated by `|`. Use `ε` (or leave the alternative empty) for epsilon.

| Arrow style | Example |
|---|---|
| `→` | `S → aSb \| ε` |
| `->` | `S -> aSb \| ε` |
| `::=` | `S ::= aSb \| ε` |

**Rules**
- **Uppercase** letters (or multi-char uppercase-leading words) = **NonTerminals**
- **Lowercase** letters, digits, and punctuation = **Terminals**
- Lines starting with `#` or `//` are treated as comments and ignored

---

## 📚 Built-in Examples

| Name | Grammar | Test string |
|---|---|---|
| aⁿbⁿ (balanced pairs) | `S → aSb \| ε` | `aabb` |
| aⁿ (repeated a's) | `S → aS \| a` | `aaaa` |
| Arithmetic Expressions | `E → E+T \| T` / `T → T*F \| F` / `F → (E) \| id` | `id+id*id` |
| Palindromes over {a,b} | `S → aSa \| bSb \| a \| b \| ε` | `ababa` |
| Simple ambiguous grammar | `S → aS \| Sa \| a` | `aaa` |

---

## 🗂 Project Structure

```
client/
├── components/
│   ├── cfg/
│   │   ├── GrammarInput.tsx       # Grammar textarea + examples dropdown
│   │   ├── StringInput.tsx        # Input string field with live validation
│   │   ├── ToggleBar.tsx          # Leftmost / Rightmost / Tree tab selector
│   │   ├── DerivationPanel.tsx    # Step-through panel with play/pause
│   │   ├── ParseTreePanel.tsx     # SVG parse tree with zoom & pan
│   │   ├── ExplanationPanel.tsx   # Contextual description + ambiguity notice
│   │   └── DerivationFailedPanel.tsx  # 3-block failure diagnosis
│   └── ui/                        # Minimal Radix UI primitives (toast, tooltip)
├── pages/
│   └── Index.tsx                  # Main page — layout & state coordinator
├── services/
│   ├── grammarParser.ts           # Raw text → ContextFreeGrammar
│   ├── derivationEngine.ts        # BFS leftmost/rightmost + parse tree builder
│   └── failureAnalyzer.ts         # Smart failure reason detector
├── types/
│   └── cfg.ts                     # All shared TypeScript interfaces
└── global.css                     # TailwindCSS + custom tokens
index.html                         # Entry point
vite.config.ts                     # Vite config (pure SPA, alias @/ → client/)
```

---

## 🧠 How It Works

### Grammar Parser (`grammarParser.ts`)
Tokenises each line by splitting on the arrow, then walks the RHS character-by-character to classify symbols as NonTerminals (uppercase-led) or terminals. A first-pass scan of all LHS symbols ensures multi-character identifiers (e.g. `id`, `E'`) are recognised correctly before RHS tokenisation.

### Derivation Engine (`derivationEngine.ts`)
Uses **BFS** over sentential forms:
1. Enqueue `[startSymbol]`
2. At each state: find the leftmost (or rightmost) NonTerminal, try every applicable production
3. Prune: all-terminal forms that don't match the target; forms longer than `target.length + 2`
4. Hit: form equals target → return the step path
5. Abort: queue exceeds 10 000 or depth exceeds 15

The parse tree is built from leftmost-derivation steps by replaying each expansion in order onto a tree node queue.

### Failure Analyzer (`failureAnalyzer.ts`)
Checks, in order:
1. **Missing terminals** — characters in target not in grammar's terminal set
2. **Infinite loop** — start symbol is not "productive" (fixpoint analysis)
3. **No derivation path** — valid grammar, string simply not in the language; estimates the language pattern for a human-readable message

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + React Router 6 |
| Language | TypeScript (strict) |
| Build | Vite 8 |
| Styling | TailwindCSS 3 |
| Icons | Lucide React |
| Toasts | Sonner |

---

## 📄 License

MIT

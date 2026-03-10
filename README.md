# WriteRight

Enforce custom academic writing policies for LaTeX/Overleaf users. Policies are defined once in a central YAML store and translated at build time into two enforcement artifacts: a Chrome extension that checks Overleaf's source editor on-demand, and a `.sty` file that emits `\PackageWarning` at pdfLaTeX compile time.

---

## Directory Structure

```
WriteRight/
├── package.json
├── .gitignore
├── policies/
│   ├── structural.yaml       # Required sections, ordering constraints
│   ├── formatting.yaml       # Caption presence, label prefix conventions
│   ├── language.yaml         # Passive voice, hedge words, sentence length (extension only)
│   └── completeness.yaml     # Label cross-references, acronym first-use
├── translators/
│   ├── schema-validate.js    # Validates all YAML before any build step
│   ├── to-extension.js       # YAML → extension/src/generated-rules.js
│   └── to-latex.js           # YAML → latex/writeright.sty
├── extension/
│   ├── manifest.json         # Manifest v3, Chrome only
│   ├── icons/
│   ├── options/
│   │   ├── options.html      # LanguageTool endpoint + API key config UI
│   │   └── options.js
│   └── src/
│       ├── generated-rules.js    # AUTO-GENERATED — do not edit
│       ├── content.js            # Main entry point injected into Overleaf
│       ├── checker.js            # Dispatches all checks, returns violations[]
│       ├── extractors/
│       │   └── codemirror.js     # Reads source text from Overleaf's CM6 editor
│       ├── checks/
│       │   ├── structural.js     # Required sections and ordering checks
│       │   ├── formatting.js     # Caption presence and label prefix checks
│       │   ├── completeness.js   # Label cross-reference and acronym checks
│       │   └── languagetool.js   # LanguageTool API + fallback regex
│       ├── ui/
│       │   ├── toolbar-button.js # Injects "Check Policies" button into toolbar
│       │   ├── sidebar.js        # Violation panel grouped by category
│       │   ├── annotations.js    # Inline underline markers on .cm-line elements
│       │   └── writeright.css
│       └── utils/
│           └── latex-parse.js    # LaTeX → plain text stripper + offset map
├── latex/
│   └── writeright.sty        # AUTO-GENERATED — do not edit
└── tests/
    ├── policies/
    │   └── validate.test.js      # All YAML valid, IDs unique, regexes compile
    ├── translators/
    │   ├── to-extension.test.js  # Translator output for extension
    │   └── to-latex.test.js      # Translator output for LaTeX
    ├── extension/
    │   ├── structural.test.js
    │   ├── formatting.test.js
    │   ├── completeness.test.js
    │   ├── latex-parse.test.js
    │   └── fixtures/
    │       ├── sample-paper.tex  # Well-formed, zero violations
    │       └── broken-paper.tex  # One violation per policy
    └── latex/
        ├── test-writeright.tex
        └── run-latex-test.js     # Runs pdflatex, parses log for warnings
```

---

## Policies

19 policies across four YAML files. Each entry follows this schema:

```yaml
id: kebab-case-id           # globally unique
category: structural|formatting|language|completeness
name: "Human readable"
description: "One sentence."
severity: warning
enabled: true
scope: extension|latex|both
check:
  type: structure|regex|macro-presence|languagetool
  # ... type-specific fields
```

| ID | Category | Scope |
|----|----------|-------|
| `struct-required-abstract` | structural | both |
| `struct-required-introduction` | structural | both |
| `struct-required-conclusion` | structural | both |
| `struct-required-references` | structural | both |
| `struct-abstract-before-intro` | structural | both |
| `fmt-figure-needs-caption` | formatting | both |
| `fmt-table-needs-caption` | formatting | both |
| `fmt-label-prefix-figure` | formatting | both |
| `fmt-label-prefix-table` | formatting | both |
| `fmt-label-prefix-section` | formatting | both |
| `fmt-label-prefix-equation` | formatting | both |
| `lang-passive-voice` | language | extension |
| `lang-hedge-words` | language | extension |
| `lang-sentence-length` | language | extension |
| `lang-first-person-singular` | language | extension |
| `comp-acronym-first-use` | completeness | both |
| `comp-label-referenced` | completeness | both |
| `comp-figure-referenced` | completeness | both |
| `comp-table-referenced` | completeness | both |

---

## Build

```bash
npm install
npm run build       # validate → build:extension → build:latex
npm test            # 7 suites, 56 tests
npm run watch       # rebuild on policy changes
```

Individual steps:

```bash
npm run validate        # schema-validate.js — fails fast on invalid YAML
npm run build:extension # generates extension/src/generated-rules.js
npm run build:latex     # generates latex/writeright.sty
```

---

## Chrome Extension

### Installation
1. Run `npm run build` to generate `extension/src/generated-rules.js`
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` directory

### Usage
Open any Overleaf project. A **Check Policies** button appears in the editor toolbar. Click it to run all enabled checks. Violations appear in a sidebar grouped by category; clicking a violation scrolls the editor to the relevant line.

### LanguageTool Configuration
Go to `chrome://extensions` → WriteRight → **Options** to configure:
- **Endpoint URL**: defaults to `https://api.languagetool.org/v2/check`; can point to a self-hosted instance
- **API Username / Key**: optional, for LanguageTool Premium

**Self-hosting LanguageTool** (no API key required):
```bash
java -jar LanguageTool-*.jar --http --port 8081
# Then set endpoint to: http://localhost:8081/v2/check
```

---

## LaTeX Package

Add `latex/writeright.sty` to your project and load it in your preamble:

```latex
\usepackage{writeright}
```

Warnings are emitted via `\PackageWarning{writeright}{...}` and appear in the pdfLaTeX log. Each warning is prefixed with the policy ID, e.g.:

```
Package writeright Warning: [struct-required-abstract] Abstract section not found
```

### Disabling individual policies

```latex
\usepackage[no-fmt-figure-needs-caption, no-comp-label-referenced]{writeright}
```

### Note on completeness checks
Label cross-reference checks (`comp-label-referenced`, `comp-figure-referenced`, `comp-table-referenced`) require **two pdfLaTeX passes** to be accurate, which is standard LaTeX behavior.

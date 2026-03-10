'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const POLICY_FILES = [
  'structural.yaml',
  'formatting.yaml',
  'language.yaml',
  'completeness.yaml',
];

const POLICIES_DIR = path.join(__dirname, '..', 'policies');
const OUTPUT_FILE = path.join(__dirname, '..', 'latex', 'writeright.sty');

function loadPolicies() {
  const all = [];
  for (const filename of POLICY_FILES) {
    const filepath = path.join(POLICIES_DIR, filename);
    const raw = fs.readFileSync(filepath, 'utf8');
    const docs = yaml.load(raw);
    if (!Array.isArray(docs)) throw new Error(`${filename}: expected a YAML array`);
    all.push(...docs);
  }
  return all;
}

// Convert policy id to a safe TeX macro name fragment
// e.g. "fmt-figure-needs-caption" → "fmtfigureneeedscaption"
function texName(id) {
  return id.replace(/-/g, '').replace(/[^a-zA-Z]/g, '');
}

function generateSty(policies) {
  const latex = [];

  // --- Preamble ---
  latex.push('%% AUTO-GENERATED — do not edit');
  latex.push(`%% Generated at: ${new Date().toISOString()}`);
  latex.push('%% Source: policies/*.yaml → translators/to-latex.js');
  latex.push('\\NeedsTeXFormat{LaTeX2e}');
  latex.push('\\ProvidesPackage{writeright}[2024/01/01 WriteRight policy enforcement]');
  latex.push('');
  latex.push('\\RequirePackage{etoolbox}');
  latex.push('\\RequirePackage{xstring}');
  latex.push('');

  // --- DeclareOption per policy (disable switch) ---
  latex.push('%% ---- Policy disable options ----');
  for (const p of policies) {
    const macro = texName(p.id);
    latex.push(`\\newif\\ifwr@enabled@${macro}\\wr@enabled@${macro}true`);
    latex.push(`\\DeclareOption{no-${p.id}}{\\wr@enabled@${macro}false}`);
  }
  latex.push('\\ProcessOptions\\relax');
  latex.push('');

  // --- Structural checks ---
  const structural = policies.filter((p) => p.category === 'structural');
  if (structural.length > 0) {
    latex.push('%% ===== STRUCTURAL CHECKS =====');
    latex.push('');

    // We track section presence via booleans and a counter for ordering
    latex.push('\\newcounter{wr@section@seq}');
    latex.push('\\setcounter{wr@section@seq}{0}');
    latex.push('');

    for (const p of structural) {
      const macro = texName(p.id);
      latex.push(`%% Policy: ${p.id}`);
      latex.push(`\\newif\\ifwr@found@${macro}\\wr@found@${macro}false`);

      if (p.id === 'struct-abstract-before-intro') {
        // Ordering check uses two sequence counters
        latex.push(`\\newcounter{wr@seq@abstract}`);
        latex.push(`\\newcounter{wr@seq@intro}`);
        latex.push(`\\setcounter{wr@seq@abstract}{0}`);
        latex.push(`\\setcounter{wr@seq@intro}{0}`);
      }
      latex.push('');
    }

    // Hook into \section to detect section names
    latex.push('%% Section detection hook');
    latex.push('\\AtBeginDocument{%');
    latex.push('  \\pretocmd{\\section}{%');
    latex.push('    \\stepcounter{wr@section@seq}%');
    latex.push('  }{}{}%');
    latex.push('}');
    latex.push('');

    // Patch \section, \begin{abstract} etc.
    // We use \AtBeginEnvironment for abstract
    latex.push('\\AtBeginEnvironment{abstract}{%');
    latex.push('  \\ifwr@enabled@structrequiredabstract\\wr@found@structrequiredabstracttrue\\fi%');
    latex.push('  \\ifwr@enabled@structabstractbeforeintro%');
    latex.push('    \\stepcounter{wr@section@seq}%');
    latex.push('    \\setcounter{wr@seq@abstract}{\\value{wr@section@seq}}%');
    latex.push('  \\fi%');
    latex.push('}');
    latex.push('');

    // Patch \section to detect Introduction, Conclusion, References
    latex.push('\\let\\wr@orig@section\\section');
    latex.push('\\renewcommand{\\section}[1]{%');
    latex.push('  \\stepcounter{wr@section@seq}%');
    latex.push('  \\IfSubStr{#1}{Abstract}{%');
    latex.push('    \\ifwr@enabled@structrequiredabstract\\wr@found@structrequiredabstracttrue\\fi%');
    latex.push('    \\ifwr@enabled@structabstractbeforeintro%');
    latex.push('      \\setcounter{wr@seq@abstract}{\\value{wr@section@seq}}%');
    latex.push('    \\fi%');
    latex.push('  }{}%');
    latex.push('  \\IfSubStr{#1}{Introduction}{%');
    latex.push('    \\ifwr@enabled@structrequiredintroduction\\wr@found@structrequiredintroductiontrue\\fi%');
    latex.push('    \\ifwr@enabled@structabstractbeforeintro%');
    latex.push('      \\setcounter{wr@seq@intro}{\\value{wr@section@seq}}%');
    latex.push('    \\fi%');
    latex.push('  }{}%');
    latex.push('  \\IfSubStr{#1}{Conclusion}{%');
    latex.push('    \\ifwr@enabled@structrequiredconclusion\\wr@found@structrequiredconclusiontrue\\fi%');
    latex.push('  }{}%');
    latex.push('  \\IfSubStr{#1}{References}{%');
    latex.push('    \\ifwr@enabled@structrequiredreferences\\wr@found@structrequiredreferencestrue\\fi%');
    latex.push('  }{}%');
    latex.push('  \\wr@orig@section{#1}%');
    latex.push('}');
    latex.push('');

    // bibliography / printbibliography detection
    latex.push('\\AtBeginEnvironment{thebibliography}{%');
    latex.push('  \\ifwr@enabled@structrequiredreferences\\wr@found@structrequiredreferencestrue\\fi%');
    latex.push('}');
    latex.push('');
    latex.push('\\@ifpackageloaded{biblatex}{%');
    latex.push('  \\AtBeginDocument{%');
    latex.push('    \\pretocmd{\\printbibliography}{%');
    latex.push('      \\ifwr@enabled@structrequiredreferences\\wr@found@structrequiredreferencestrue\\fi%');
    latex.push('    }{}{}%');
    latex.push('  }%');
    latex.push('}{}');
    latex.push('');

    // AtEndDocument — emit warnings for missing sections
    latex.push('\\AtEndDocument{%');
    latex.push('  \\ifwr@enabled@structrequiredabstract%');
    latex.push('    \\ifwr@found@structrequiredabstract\\else%');
    latex.push('      \\PackageWarning{writeright}{[struct-required-abstract] Abstract section not found}%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('  \\ifwr@enabled@structrequiredintroduction%');
    latex.push('    \\ifwr@found@structrequiredintroduction\\else%');
    latex.push('      \\PackageWarning{writeright}{[struct-required-introduction] Introduction section not found}%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('  \\ifwr@enabled@structrequiredconclusion%');
    latex.push('    \\ifwr@found@structrequiredconclusion\\else%');
    latex.push('      \\PackageWarning{writeright}{[struct-required-conclusion] Conclusion section not found}%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('  \\ifwr@enabled@structrequiredreferences%');
    latex.push('    \\ifwr@found@structrequiredreferences\\else%');
    latex.push('      \\PackageWarning{writeright}{[struct-required-references] References/bibliography not found}%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('  \\ifwr@enabled@structabstractbeforeintro%');
    latex.push('    \\ifnum\\value{wr@seq@abstract}>0%');
    latex.push('      \\ifnum\\value{wr@seq@intro}>0%');
    latex.push('        \\ifnum\\value{wr@seq@abstract}>\\value{wr@seq@intro}%');
    latex.push('          \\PackageWarning{writeright}{[struct-abstract-before-intro] Abstract appears after Introduction}%');
    latex.push('        \\fi%');
    latex.push('      \\fi%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('}');
    latex.push('');
  }

  // --- Formatting checks ---
  const formatting = policies.filter((p) => p.category === 'formatting');
  if (formatting.length > 0) {
    latex.push('%% ===== FORMATTING CHECKS =====');
    latex.push('');

    // Caption presence in figure
    latex.push('%% Figure caption check');
    latex.push('\\ifwr@enabled@fmtfigureneedscaption');
    latex.push('  \\newif\\ifwr@figcaptionfound');
    latex.push('  \\AtBeginEnvironment{figure}{%');
    latex.push('    \\wr@figcaptionfoundfalse%');
    latex.push('    \\let\\wr@orig@caption\\caption%');
    latex.push('    \\renewcommand{\\caption}[2][]{\\wr@figcaptionfoundtrue\\wr@orig@caption[#1]{#2}}%');
    latex.push('  }');
    latex.push('  \\AtEndEnvironment{figure}{%');
    latex.push('    \\ifwr@figcaptionfound\\else%');
    latex.push('      \\PackageWarning{writeright}{[fmt-figure-needs-caption] Figure has no \\noexpand\\caption}%');
    latex.push('    \\fi%');
    latex.push('  }');
    latex.push('\\fi');
    latex.push('');

    // Caption presence in table
    latex.push('%% Table caption check');
    latex.push('\\ifwr@enabled@fmttableneedscaption');
    latex.push('  \\newif\\ifwr@tablecaptionfound');
    latex.push('  \\AtBeginEnvironment{table}{%');
    latex.push('    \\wr@tablecaptionfoundfalse%');
    latex.push('    \\let\\wr@orig@tablecaption\\caption%');
    latex.push('    \\renewcommand{\\caption}[2][]{\\wr@tablecaptionfoundtrue\\wr@orig@tablecaption[#1]{#2}}%');
    latex.push('  }');
    latex.push('  \\AtEndEnvironment{table}{%');
    latex.push('    \\ifwr@tablecaptionfound\\else%');
    latex.push('      \\PackageWarning{writeright}{[fmt-table-needs-caption] Table has no \\noexpand\\caption}%');
    latex.push('    \\fi%');
    latex.push('  }');
    latex.push('\\fi');
    latex.push('');

    // Label prefix checks — done at \label time
    latex.push('%% Label prefix checks');
    latex.push('\\newif\\ifwr@infigure');
    latex.push('\\newif\\ifwr@intable');
    latex.push('\\newif\\ifwr@inequation');
    latex.push('\\AtBeginEnvironment{figure}{\\wr@infiguretrue}');
    latex.push('\\AtEndEnvironment{figure}{\\wr@infigurefalse}');
    latex.push('\\AtBeginEnvironment{table}{\\wr@intabletrue}');
    latex.push('\\AtEndEnvironment{table}{\\wr@intablefalse}');
    latex.push('\\AtBeginEnvironment{equation}{\\wr@inequationtrue}');
    latex.push('\\AtEndEnvironment{equation}{\\wr@inequationfalse}');
    latex.push('\\AtBeginEnvironment{align}{\\wr@inequationtrue}');
    latex.push('\\AtEndEnvironment{align}{\\wr@inequationfalse}');
    latex.push('\\AtBeginEnvironment{gather}{\\wr@inequationtrue}');
    latex.push('\\AtEndEnvironment{gather}{\\wr@inequationfalse}');
    latex.push('\\AtBeginEnvironment{multline}{\\wr@inequationtrue}');
    latex.push('\\AtEndEnvironment{multline}{\\wr@inequationfalse}');
    latex.push('');
    latex.push('\\let\\wr@orig@label\\label');
    latex.push('\\renewcommand{\\label}[1]{%');
    // figure label check
    latex.push('  \\ifwr@enabled@fmtlabelprefixfigure%');
    latex.push('    \\ifwr@infigure%');
    latex.push('      \\IfBeginWith{#1}{fig:}{}{%');
    latex.push('        \\PackageWarning{writeright}{[fmt-label-prefix-figure] Figure label "#1" does not use fig: prefix}%');
    latex.push('      }%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    // table label check
    latex.push('  \\ifwr@enabled@fmtlabelprefixtable%');
    latex.push('    \\ifwr@intable%');
    latex.push('      \\IfBeginWith{#1}{tab:}{}{%');
    latex.push('        \\PackageWarning{writeright}{[fmt-label-prefix-table] Table label "#1" does not use tab: prefix}%');
    latex.push('      }%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    // equation label check
    latex.push('  \\ifwr@enabled@fmtlabelprefixequation%');
    latex.push('    \\ifwr@inequation%');
    latex.push('      \\IfBeginWith{#1}{eq:}{}{%');
    latex.push('        \\PackageWarning{writeright}{[fmt-label-prefix-equation] Equation label "#1" does not use eq: prefix}%');
    latex.push('      }%');
    latex.push('    \\fi%');
    latex.push('  \\fi%');
    latex.push('  \\wr@orig@label{#1}%');
    latex.push('}');
    latex.push('');

    // Section label prefix — track "after section" state
    latex.push('%% Section label prefix check');
    latex.push('\\newif\\ifwr@aftersection');
    latex.push('\\wr@aftersectionfalse');
    latex.push('\\AtBeginDocument{%');
    latex.push('  \\pretocmd{\\section}{\\wr@aftersectiontrue}{}{}%');
    latex.push('  \\pretocmd{\\subsection}{\\wr@aftersectiontrue}{}{}%');
    latex.push('  \\pretocmd{\\subsubsection}{\\wr@aftersectiontrue}{}{}%');
    latex.push('}');
    // We already patched \label above; extend it here with sec: check
    // Instead, patch at document begin so our \label patch is already in place
    latex.push('\\AtBeginDocument{%');
    latex.push('  \\let\\wr@labelwithsec\\label%');
    latex.push('  \\renewcommand{\\label}[1]{%');
    latex.push('    \\ifwr@enabled@fmtlabelprefixsection%');
    latex.push('      \\ifwr@aftersection%');
    latex.push('        \\IfBeginWith{#1}{sec:}{}{%');
    latex.push('          \\PackageWarning{writeright}{[fmt-label-prefix-section] Section label "#1" does not use sec: prefix}%');
    latex.push('        }%');
    latex.push('        \\wr@aftersectionfalse%');
    latex.push('      \\fi%');
    latex.push('    \\fi%');
    latex.push('    \\wr@labelwithsec{#1}%');
    latex.push('  }%');
    latex.push('}');
    latex.push('');
  }

  // --- Completeness checks ---
  const completeness = policies.filter((p) => p.category === 'completeness');
  if (completeness.length > 0) {
    latex.push('%% ===== COMPLETENESS CHECKS =====');
    latex.push('');

    latex.push('%% Label cross-reference check (requires two pdfLaTeX passes)');
    latex.push('\\ifwr@enabled@complabelreferenced');
    latex.push('  \\newif\\ifwr@auxread');
    // We use the .aux file approach: collect defined labels and used refs
    // Compare at AtEndDocument
    latex.push('  \\let\\wr@defined@labels\\@empty');
    latex.push('  \\let\\wr@referenced@labels\\@empty');
    latex.push('');
    // Patch \label — accumulate keys
    latex.push('  \\AtBeginDocument{%');
    latex.push('    \\let\\wr@complabel@orig\\label%');
    latex.push('    \\renewcommand{\\label}[1]{%');
    latex.push('      \\listgadd{\\wr@defined@labels}{#1}%');
    latex.push('      \\wr@complabel@orig{#1}%');
    latex.push('    }%');
    // Patch \ref and friends
    latex.push('    \\let\\wr@orig@ref\\ref%');
    latex.push('    \\renewcommand{\\ref}[1]{\\listgadd{\\wr@referenced@labels}{#1}\\wr@orig@ref{#1}}%');
    latex.push('    \\@ifpackagedefined{hyperref}{%');
    latex.push('      \\let\\wr@orig@autoref\\autoref%');
    latex.push('      \\renewcommand{\\autoref}[1]{\\listgadd{\\wr@referenced@labels}{#1}\\wr@orig@autoref{#1}}%');
    latex.push('    }{}%');
    latex.push('  }%');
    latex.push('');
    latex.push('  \\AtEndDocument{%');
    latex.push('    \\def\\wr@check@label@ref##1{%');
    latex.push('      \\xifinlistcs{##1}{wr@referenced@labels}{}{%');
    latex.push('        \\PackageWarning{writeright}{[comp-label-referenced] Label "##1" is defined but never referenced}%');
    latex.push('      }%');
    latex.push('    }%');
    latex.push('    \\forlistloop{\\wr@check@label@ref}{\\wr@defined@labels}%');
    latex.push('  }%');
    latex.push('\\fi');
    latex.push('');

    // Figure and table referenced checks build on top of the label check
    latex.push('%% Figure referenced check');
    latex.push('\\ifwr@enabled@compfigureferenced');
    latex.push('  \\AtEndDocument{%');
    latex.push('    \\def\\wr@check@fig@ref##1{%');
    latex.push('      \\IfBeginWith{##1}{fig:}{%');
    latex.push('        \\xifinlistcs{##1}{wr@referenced@labels}{}{%');
    latex.push('          \\PackageWarning{writeright}{[comp-figure-referenced] Figure label "##1" is never referenced}%');
    latex.push('        }%');
    latex.push('      }{}%');
    latex.push('    }%');
    latex.push('    \\forlistloop{\\wr@check@fig@ref}{\\wr@defined@labels}%');
    latex.push('  }%');
    latex.push('\\fi');
    latex.push('');

    latex.push('%% Table referenced check');
    latex.push('\\ifwr@enabled@comptablereferenced');
    latex.push('  \\AtEndDocument{%');
    latex.push('    \\def\\wr@check@tab@ref##1{%');
    latex.push('      \\IfBeginWith{##1}{tab:}{%');
    latex.push('        \\xifinlistcs{##1}{wr@referenced@labels}{}{%');
    latex.push('          \\PackageWarning{writeright}{[comp-table-referenced] Table label "##1" is never referenced}%');
    latex.push('        }%');
    latex.push('      }{}%');
    latex.push('    }%');
    latex.push('    \\forlistloop{\\wr@check@tab@ref}{\\wr@defined@labels}%');
    latex.push('  }%');
    latex.push('\\fi');
    latex.push('');
  }

  latex.push('\\endinput');
  return latex.join('\n');
}

function main() {
  const policies = loadPolicies();
  const filtered = policies.filter(
    (p) => p.enabled && (p.scope === 'latex' || p.scope === 'both')
  );

  const sty = generateSty(filtered);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, sty, 'utf8');

  console.log(`[to-latex] Generated ${filtered.length} policy checks → latex/writeright.sty`);
}

main();

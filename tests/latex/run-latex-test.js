'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const LATEX_DIR = path.join(__dirname, '..', '..', 'latex');
const TEST_TEX = path.join(__dirname, 'test-writeright.tex');

/**
 * Run pdflatex on the test file and check the log for expected warnings.
 * Skips gracefully if pdflatex is not found.
 */
describe('LaTeX writeright.sty integration', () => {
  let pdflatexAvailable = false;
  let logContent = '';

  beforeAll(() => {
    // Check if pdflatex is available
    const which = spawnSync('which', ['pdflatex'], { encoding: 'utf8' });
    pdflatexAvailable = which.status === 0;

    if (!pdflatexAvailable) {
      console.warn('[run-latex-test] pdflatex not found — skipping LaTeX integration tests');
      return;
    }

    // First, ensure writeright.sty is generated and in TEXINPUTS path
    const styPath = path.join(LATEX_DIR, 'writeright.sty');
    if (!fs.existsSync(styPath)) {
      require('../../translators/to-latex.js');
    }

    // Run pdflatex twice (for two-pass checks)
    const env = {
      ...process.env,
      TEXINPUTS: `${LATEX_DIR}:${process.env.TEXINPUTS || ''}`,
    };

    const opts = {
      cwd: __dirname,
      env,
      encoding: 'utf8',
      timeout: 60000,
    };

    const logFile = path.join(__dirname, 'test-writeright.log');

    try {
      spawnSync(
        'pdflatex',
        ['-interaction=nonstopmode', '-halt-on-error', TEST_TEX],
        opts
      );
      spawnSync(
        'pdflatex',
        ['-interaction=nonstopmode', TEST_TEX],
        opts
      );

      if (fs.existsSync(logFile)) {
        logContent = fs.readFileSync(logFile, 'utf8');
      }
    } catch (err) {
      console.error('[run-latex-test] pdflatex run failed:', err.message);
    }
  });

  const skipIfNoPdflatex = () => {
    if (!pdflatexAvailable) {
      return true;
    }
    return false;
  };

  test('pdflatex run produces a log file', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent.length).toBeGreaterThan(0);
  });

  test('log contains [struct-required-abstract] warning', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent).toContain('[struct-required-abstract]');
  });

  test('log contains [struct-required-conclusion] warning', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent).toContain('[struct-required-conclusion]');
  });

  test('log contains [fmt-figure-needs-caption] warning', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent).toContain('[fmt-figure-needs-caption]');
  });

  test('log contains [fmt-table-needs-caption] warning', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent).toContain('[fmt-table-needs-caption]');
  });

  test('log contains writeright package warning prefix', () => {
    if (skipIfNoPdflatex()) return;
    expect(logContent).toContain('Package writeright Warning:');
  });
});

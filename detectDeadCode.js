#!/usr/bin/env node
/**
 * Dead Code Detection Script with Directory Support
 *
 * Examples:
 *   node detect-dead-code.js --dir ./lib --knip
 *   node detect-dead-code.js --all --dir src
 */

const { execSync } = require("child_process");

const args = process.argv.slice(2);

// Extract directory flag (default = current project directory)
let dir = ".";
const dirArg = args.find(a => a.startsWith("--dir"));
if (dirArg) {
  dir = dirArg.split("=")[1] || args[args.indexOf(dirArg) + 1];
  if (!dir) {
    console.error("ERROR: --dir requires a value");
    process.exit(1);
  }
}

const flags = {
  knip: args.includes("--knip") || args.includes("--all"),
  tsprune: args.includes("--tsprune") || args.includes("--all"),
  skott: args.includes("--skott") || args.includes("--all"),
  coverage: args.includes("--coverage") || args.includes("--all"),
};

function run(cmd, label) {
  console.log(`\n=== Running ${label} in ${dir} ===`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`\n✓ ${label} completed.\n`);
  } catch (err) {
    console.error(`\n✗ ${label} failed.\n`);
  }
}

// Show help
if (!args.length) {
  console.log(`
Usage:
  node detect-dead-code.js [options]

Options:
  --dir <folder>    Specify folder to analyze (default: project root)
  --knip            Run Knip
  --tsprune         Run ts-prune
  --skott           Run skott
  --coverage        Run NYC test coverage
  --all             Run everything

Examples:
  node detect-dead-code.js --dir ./lib --knip
  node detect-dead-code.js --all --dir src
`);
  process.exit(0);
}

// ---------------------------
// KNIP
// ---------------------------
if (flags.knip) {
  run(`npx knip --project ${dir}`, "Knip");
}

// ---------------------------
// TSPRUNE
// ---------------------------
if (flags.tsprune) {
  run(`npx ts-prune --project ${dir}`, "ts-prune");
}

// ---------------------------
// SKOTT
// ---------------------------
if (flags.skott) {
  run(`npx skott --cwd ${dir} --show-dependencies --ignore node_modules`, "skott");
}

// ---------------------------
// NYC COVERAGE
// ---------------------------
if (flags.coverage) {
  // Your tests must naturally import code in the target dir.
  run(`npx nyc --reporter=text npm test`, "NYC Coverage");
}

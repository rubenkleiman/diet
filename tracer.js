// tracer.js
import fs from "fs";
import path from "path";
import { AsyncLocalStorage } from "async_hooks";
import { fileURLToPath } from "url";

const LOG_FILE = path.join(process.cwd(), "call-trace.log");
const MAX_DEPTH = 6;

const TRACE_INCLUDE = [path.join(process.cwd(), "app.js")];

const asyncLocal = new AsyncLocalStorage();

function log(line) {
  fs.appendFileSync(LOG_FILE, line + "\n");
}

function normalizeFile(file) {
  if (!file) return "<unknown>";
  if (file.startsWith("file://")) return fileURLToPath(file);
  return file;
}

function shouldTrace(file) {
  file = normalizeFile(file);
  return TRACE_INCLUDE.some(inc => file === inc || file.startsWith(inc + path.sep));
}

// Wrap any function with tracing
export function wrapFunction(fn, name, file) {
  const fnName = name || fn.name || "<anonymous>";
  return function (...args) {
    const store = asyncLocal.getStore();
    const depth = store?.depth ?? 0;

    if (!store?.active || depth > MAX_DEPTH || !shouldTrace(file)) {
      return fn(...args);
    }

    const indent = "  ".repeat(depth);
    log(`${indent}-> ${file}:${fnName}`);
    store.depth = depth + 1;

    const result = fn(...args);

    store.depth = depth;
    log(`${indent}<- ${file}:${fnName}`);
    return result;
  };
}

// Automatically wrap all top-level functions in a module
export function wrapModuleFunctions(obj, file) {
  const wrapped = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "function") {
      wrapped[key] = wrapFunction(value, key, file);
    } else {
      wrapped[key] = value;
    }
  }
  return wrapped;
}

// Patch Express route methods to wrap handlers
export function patchExpress(app) {
  const verbs = ["get","post","put","delete","patch","all"];
  const appFile = path.join(process.cwd(), "app.js");

  for (const verb of verbs) {
    const original = app[verb].bind(app);
    app[verb] = function(pathArg, ...handlers) {
      const wrappedHandlers = handlers.map(fn =>
        (...args) => asyncLocal.run({ depth: 0, active: true }, () =>
          wrapFunction(fn, fn.name || "<anonymous>", appFile)(...args)
        )
      );
      return original(pathArg, ...wrappedHandlers);
    };
  }

  console.log(`Tracing ENABLED — writing to ${LOG_FILE}`);
}

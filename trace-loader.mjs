// trace-loader.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const LOG_PATH = path.resolve(process.cwd(), "call-trace.log");
const log = fs.createWriteStream(LOG_PATH, { flags: "a" });

// Write startup header once
log.write(`--- ESM tracer started at ${new Date().toISOString()} ---\n`);

// Utility: wrap a function with logging
function wrapFunction(filePath, name, fn) {
  return function (...args) {
    log.write(`[${new Date().toISOString()}] ${filePath}:${name}\n`);
    return fn.apply(this, args);
  };
}

function wrapExports(exports, filePath) {
  if (typeof exports === "function") {
    return wrapFunction(filePath, exports.name || "<anonymous>", exports);
  }

  if (typeof exports === "object" && exports !== null) {
    const wrapped = {};
    for (const key of Object.keys(exports)) {
      const val = exports[key];
      if (typeof val === "function") {
        wrapped[key] = wrapFunction(filePath, key, val);
      } else {
        wrapped[key] = val;
      }
    }
    return wrapped;
  }

  return exports;
}

// MAIN ESM LOADER HOOKS
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  // Skip builtins + node-internal + node_modules
  if (
    url.startsWith("node:") ||
    url.includes("/node_modules/")
  ) {
    return result;
  }

  // Only trace modules under ./lib
  const rel = path.relative(process.cwd(), fileURLToPath(url));
  if (!rel.startsWith(`lib${path.sep}`)) {
    return result;
  }

  // If module exports functions, wrap them
  if (result.format === "module" && result.source) {
    // Convert module source into a wrapper
    // This is a transform loader: we inject a call to wrapExports.
    const wrappedSource = `
      import { createRequire } from "module";
      const require = createRequire(import.meta.url);
      const wrapper = require("./trace-cjs.cjs")._wrapExportsESM;

      const __wrapped = wrapper((() => {
        ${result.source}
      })(), ${JSON.stringify(rel)});

      export default __wrapped.default;
      export const { ${Object.keys(result.exports || []).join(",")} } = __wrapped;
    `;

    return {
      format: "module",
      source: wrappedSource,
    };
  }

  return result;
}

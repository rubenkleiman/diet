// trace-cjs.cjs
const fs = require("fs");
const path = require("path");
const hook = require("require-in-the-middle");

const LOG_PATH = path.join(process.cwd(), "call-trace.log");
const log = fs.createWriteStream(LOG_PATH, { flags: "a" });

log.write(`--- CJS tracer started at ${new Date().toISOString()} ---\n`);

function wrapFunction(filePath, name, fn) {
  return function (...args) {
    log.write(`[${new Date().toISOString()}] ${filePath}:${name}\n`);
    return fn.apply(this, args);
  };
}

function wrapObject(obj, filePath) {
  if (typeof obj === "function") {
    return wrapFunction(filePath, obj.name || "<anonymous>", obj);
  }
  if (typeof obj === "object" && obj !== null) {
    const wrapped = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === "function") {
        wrapped[key] = wrapFunction(filePath, key, val);
      } else {
        wrapped[key] = val;
      }
    }
    return wrapped;
  }
  return obj;
}

// Intercept CJS requires under lib/
hook([], (exports, name, basedir) => {
  if (!basedir) return exports;

  const rel = path.relative(process.cwd(), name);
  if (rel.startsWith("lib" + path.sep)) {
    return wrapObject(exports, rel);
  }

  return exports;
});

// Export wrapper for use by ESM loader
exports._wrapExportsESM = (exports, rel) => wrapObject(exports, rel);

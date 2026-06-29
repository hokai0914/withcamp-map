const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const stateFile = path.join(dataDir, "map-state.json");

async function readState() {
  try {
    const rawState = await fs.readFile(stateFile, "utf8");
    return JSON.parse(rawState);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { floors: [] };
  }
}

async function writeState(state) {
  validateState(state);

  if (process.env.VERCEL) {
    const error = new Error(
      "Vercel deployments cannot persist runtime file changes. Connect a database or Vercel Blob for shared admin saves.",
    );
    error.statusCode = 501;
    throw error;
  }

  await fs.mkdir(dataDir, { recursive: true });
  const tempFile = `${stateFile}.${process.pid}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await fs.rename(tempFile, stateFile);
}

function validateState(state) {
  if (!state || !Array.isArray(state.floors)) {
    const error = new Error("State must include a floors array");
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  readState,
  validateState,
  writeState,
};

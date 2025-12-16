import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

console.log("🔨 Building workout-trainer...\n");

// 1. Compile program.yaml → src/data/program.ts
console.log("📄 Compiling program.yaml...");
const programYaml = fs.readFileSync("./program.yaml", "utf8");
const programData = yaml.load(programYaml);

// Create src/data directory if it doesn't exist
const dataDir = "./src/data";
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const tsContent = `// Auto-generated from program.yaml
// Do not edit manually

import type { ProgramData } from "../types/program";

export const programData: ProgramData = ${JSON.stringify(programData, null, 2)} as const;

export default programData;
`;

fs.writeFileSync("./src/data/program.ts", tsContent);
console.log("✓ Generated src/data/program.ts\n");

// 2. Compile Tailwind CSS
console.log("🎨 Compiling Tailwind CSS...");

// Create src/styles directory if it doesn't exist
const stylesDir = "./src/styles";
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

// Create public/workout directory if it doesn't exist
const publicDir = "./public/workout";
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create base CSS file if it doesn't exist
const baseCSS = "./src/styles/app.css";
if (!fs.existsSync(baseCSS)) {
  fs.writeFileSync(baseCSS, `@import "tailwindcss";`);
}

try {
  await execAsync(
    "./node_modules/.bin/tailwindcss -i ./src/styles/app.css -o ./public/workout/styles.css --minify"
  );
  console.log("✓ Compiled Tailwind CSS to public/workout/styles.css\n");
} catch (error) {
  console.error("⚠️  Tailwind CSS compilation failed:", error.message);
  console.log("   Continuing without CSS compilation...\n");
}

console.log("✅ Build complete!\n");

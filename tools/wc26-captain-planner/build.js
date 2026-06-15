// Validates fixtures then inlines index.html + styles.css + app.js + fixtures
// into ONE self-contained, offline-capable HTML file.
//
// Outputs:
//   dist/worldcup-captain-planner.html            (portable single file)
//   ../../public/tools/wc26-d25bb010b528.html      (served by the Next app)
//
// Run: node build.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dir = __dirname;

// 1) Validate fixtures (aborts on failure)
execSync("node validate.js", { cwd: dir, stdio: "inherit" });

// 2) Inline
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const fixtures = fs.readFileSync(path.join(dir, "fixtures.json"), "utf8").trim();

let out = html
  .replace(
    /<link rel="stylesheet" href="styles\.css"\s*\/>/,
    `<style>\n${css}\n</style>`
  )
  .replace(
    /<script src="app\.js"><\/script>/,
    `<script>window.__FIXTURES__ = ${fixtures};</script>\n  <script>\n${js}\n</script>`
  );

if (/href="styles\.css"|src="app\.js"|src="fixtures\.json"/.test(out)) {
  console.error("✗ Inlining failed — external references remain.");
  process.exit(1);
}

const distDir = path.join(dir, "dist");
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, "worldcup-captain-planner.html"), out);

const publicFile = path.join(dir, "../../public/tools/wc26-d25bb010b528.html");
fs.mkdirSync(path.dirname(publicFile), { recursive: true });
fs.writeFileSync(publicFile, out);

console.log(
  `✓ Built single-file app (${(out.length / 1024).toFixed(0)} KB) → dist/ and public/tools/wc26-d25bb010b528.html`
);

// Validates fixtures, then builds the served tool:
//   - public/tools/wc26-d25bb010b528.html          (CSS + JS inlined)
//   - public/tools/wc26-d25bb010b528.fixtures.json  (fetched live at runtime)
//
// Fixtures are served separately (not inlined) so the data can be updated
// without rebuilding, and the tool also uses the app's /api/wc26-import
// backend — i.e. it is intentionally NOT a fully offline file.
//
// Run: node build.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dir = __dirname;
const SLUG = "wc26-d25bb010b528";

// 1) Validate fixtures (aborts on failure)
execSync("node validate.js", { cwd: dir, stdio: "inherit" });

// 2) Inline CSS + JS; point the app at the live fixtures + import endpoints
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const css = fs.readFileSync(path.join(dir, "styles.css"), "utf8");
const js = fs.readFileSync(path.join(dir, "app.js"), "utf8");
const fixtures = fs.readFileSync(path.join(dir, "fixtures.json"), "utf8").trim();
const players = fs.readFileSync(path.join(dir, "players.json"), "utf8").trim();

const config = `<script>window.__FIXTURES_URL__="/tools/${SLUG}.fixtures.json";window.__PLAYERS__=${players};</script>`;

let out = html
  .replace(/<link rel="stylesheet" href="styles\.css"\s*\/>/, `<style>\n${css}\n</style>`)
  .replace(/<script src="app\.js"><\/script>/, `${config}\n  <script>\n${js}\n</script>`);

if (/href="styles\.css"|src="app\.js"/.test(out)) {
  console.error("✗ Inlining failed — external references remain.");
  process.exit(1);
}

const publicDir = path.join(dir, "../../public/tools");
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, `${SLUG}.html`), out);
fs.writeFileSync(path.join(publicDir, `${SLUG}.fixtures.json`), fixtures + "\n");

console.log(
  `✓ Built ${SLUG}.html (${(out.length / 1024).toFixed(0)} KB) + ${SLUG}.fixtures.json → public/tools/`
);

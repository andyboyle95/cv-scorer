// Builds a single self-contained cost-of-commuting.html by injecting the car
// and fuel data into the template. Run: node scripts/build-commute-html.js
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const template = fs.readFileSync(
  path.join(__dirname, "commute-standalone.template.html"),
  "utf8"
);
const cars = fs.readFileSync(path.join(root, "public/data/cars.json"), "utf8").trim();
const data = fs
  .readFileSync(path.join(root, "public/data/commute-data.json"), "utf8")
  .trim();

const html = template.replace("__CARS__", cars).replace("__DATA__", data);
const out = path.join(root, "cost-of-commuting.html");
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);

// Generates players.json (autocomplete DB) from the curated player→country
// map plus a set of well-known full names. Run: node build-players.js
const fs = require("fs");
const path = require("path");

const ts = fs.readFileSync(path.join(__dirname, "../../src/lib/wc26-players.ts"), "utf8");
const lit = ts.match(/=\s*(\{[\s\S]*?\})\s*;/)[1];
const obj = new Function("return " + lit)();
const title = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

const seen = new Set();
const players = [];
const add = (n, c) => {
  const k = n.toLowerCase() + "|" + c;
  if (seen.has(k)) return;
  seen.add(k);
  players.push({ n, c });
};

for (const [country, names] of Object.entries(obj)) for (const n of names) add(title(n), country);

// Well-known full names (improves search: "Jude", "Kylian", and ambiguous surnames).
const EXTRA = [
  ["Jude Bellingham", "England"], ["Harry Kane", "England"], ["Bukayo Saka", "England"], ["Phil Foden", "England"], ["Cole Palmer", "England"], ["Declan Rice", "England"], ["Trent Alexander-Arnold", "England"], ["Marcus Rashford", "England"],
  ["Kylian Mbappé", "France"], ["Antoine Griezmann", "France"], ["Ousmane Dembélé", "France"], ["Aurélien Tchouaméni", "France"], ["William Saliba", "France"], ["Mike Maignan", "France"], ["Randal Kolo Muani", "France"], ["Bradley Barcola", "France"],
  ["Joshua Kimmich", "Germany"], ["Florian Wirtz", "Germany"], ["Jamal Musiala", "Germany"], ["Kai Havertz", "Germany"], ["Antonio Rüdiger", "Germany"], ["Niclas Füllkrug", "Germany"], ["Leroy Sané", "Germany"],
  ["Lamine Yamal", "Spain"], ["Rodri", "Spain"], ["Pedri", "Spain"], ["Gavi", "Spain"], ["Álvaro Morata", "Spain"], ["Nico Williams", "Spain"], ["Dani Olmo", "Spain"], ["Mikel Oyarzabal", "Spain"],
  ["Vinícius Júnior", "Brazil"], ["Rodrygo", "Brazil"], ["Raphinha", "Brazil"], ["Endrick", "Brazil"], ["Neymar", "Brazil"], ["Casemiro", "Brazil"], ["Alisson", "Brazil"], ["Bruno Guimarães", "Brazil"], ["Gabriel Magalhães", "Brazil"], ["Gabriel Jesus", "Brazil"],
  ["Cristiano Ronaldo", "Portugal"], ["Bruno Fernandes", "Portugal"], ["Bernardo Silva", "Portugal"], ["Rafael Leão", "Portugal"], ["Vitinha", "Portugal"], ["Rúben Dias", "Portugal"], ["João Cancelo", "Portugal"], ["Diogo Jota", "Portugal"], ["João Félix", "Portugal"], ["Nuno Mendes", "Portugal"],
  ["Lionel Messi", "Argentina"], ["Julián Álvarez", "Argentina"], ["Lautaro Martínez", "Argentina"], ["Ángel Di María", "Argentina"], ["Rodrigo De Paul", "Argentina"], ["Alexis Mac Allister", "Argentina"], ["Enzo Fernández", "Argentina"], ["Emiliano Martínez", "Argentina"], ["Cristian Romero", "Argentina"],
  ["Erling Haaland", "Norway"], ["Martin Ødegaard", "Norway"], ["Alexander Sørloth", "Norway"], ["Antonio Nusa", "Norway"],
  ["Virgil van Dijk", "Netherlands"], ["Memphis Depay", "Netherlands"], ["Cody Gakpo", "Netherlands"], ["Frenkie de Jong", "Netherlands"], ["Xavi Simons", "Netherlands"],
  ["Kevin De Bruyne", "Belgium"], ["Romelu Lukaku", "Belgium"], ["Jérémy Doku", "Belgium"],
  ["Luka Modrić", "Croatia"], ["Joško Gvardiol", "Croatia"],
  ["Christian Pulisic", "United States"], ["Weston McKennie", "United States"], ["Gio Reyna", "United States"], ["Folarin Balogun", "United States"],
  ["Son Heung-min", "South Korea"], ["Kim Min-jae", "South Korea"], ["Lee Kang-in", "South Korea"],
  ["Takefusa Kubo", "Japan"], ["Kaoru Mitoma", "Japan"],
  ["Granit Xhaka", "Switzerland"], ["Manuel Akanji", "Switzerland"], ["Breel Embolo", "Switzerland"], ["Nico Elvedi", "Switzerland"],
  ["Federico Valverde", "Uruguay"], ["Darwin Núñez", "Uruguay"], ["Ronald Araújo", "Uruguay"], ["Mathías Olivera", "Uruguay"],
  ["Alexander Isak", "Sweden"], ["Viktor Gyökeres", "Sweden"], ["Dejan Kulusevski", "Sweden"],
  ["Hakan Çalhanoğlu", "Turkey"], ["Arda Güler", "Turkey"], ["Kenan Yıldız", "Turkey"],
  ["Mohamed Salah", "Egypt"], ["Omar Marmoush", "Egypt"],
  ["Achraf Hakimi", "Morocco"], ["Hakim Ziyech", "Morocco"], ["Youssef En-Nesyri", "Morocco"],
  ["Sadio Mané", "Senegal"], ["Kalidou Koulibaly", "Senegal"], ["Nicolas Jackson", "Senegal"],
  ["Riyad Mahrez", "Algeria"], ["Ismaël Bennacer", "Algeria"],
  ["Alphonso Davies", "Canada"], ["Jonathan David", "Canada"], ["Tajon Buchanan", "Canada"],
  ["James Rodríguez", "Colombia"], ["Luis Díaz", "Colombia"], ["Jhon Durán", "Colombia"],
  ["Mohammed Kudus", "Ghana"], ["Thomas Partey", "Ghana"],
  ["Mehdi Taremi", "Iran"], ["Sardar Azmoun", "Iran"],
  ["Edson Álvarez", "Mexico"], ["Hirving Lozano", "Mexico"], ["Santiago Giménez", "Mexico"],
];
for (const [n, c] of EXTRA) add(n, c);

players.sort((a, b) => a.n.localeCompare(b.n));
fs.writeFileSync(path.join(__dirname, "players.json"), JSON.stringify(players));
console.log("players.json:", players.length, "entries");

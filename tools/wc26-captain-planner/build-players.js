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

// Full official WC2026 squads (all 48 teams), parsed from the Wikipedia
// "2026 FIFA World Cup squads" page into squads.json. This is the bulk of the
// pool — every named tournament player resolves to their country.
const squads = JSON.parse(fs.readFileSync(path.join(__dirname, "squads.json"), "utf8"));
for (const p of squads) add(p.n, p.c);

// Well-known full names (improves search: "Jude", "Kylian", ambiguous surnames,
// and squad-depth players whose distinctive surname isn't in the curated map).
// Restricted to the 48 nations actually in the WC2026 fixtures so every entry
// resolves to a real match in the planner.
const EXTRA = [
  // England
  ["Jude Bellingham", "England"], ["Harry Kane", "England"], ["Bukayo Saka", "England"], ["Phil Foden", "England"], ["Cole Palmer", "England"], ["Declan Rice", "England"], ["Trent Alexander-Arnold", "England"], ["Marcus Rashford", "England"], ["Jordan Pickford", "England"], ["Kyle Walker", "England"], ["John Stones", "England"], ["Marc Guéhi", "England"], ["Ezri Konsa", "England"], ["Levi Colwill", "England"], ["Kieran Trippier", "England"], ["Conor Gallagher", "England"], ["Kobbie Mainoo", "England"], ["Adam Wharton", "England"], ["James Maddison", "England"], ["Jarrod Bowen", "England"], ["Anthony Gordon", "England"], ["Ollie Watkins", "England"], ["Eberechi Eze", "England"], ["Morgan Gibbs-White", "England"], ["Noni Madueke", "England"], ["Dean Henderson", "England"], ["Reece James", "England"],
  // France
  ["Kylian Mbappé", "France"], ["Antoine Griezmann", "France"], ["Ousmane Dembélé", "France"], ["Aurélien Tchouaméni", "France"], ["William Saliba", "France"], ["Mike Maignan", "France"], ["Randal Kolo Muani", "France"], ["Bradley Barcola", "France"], ["Theo Hernández", "France"], ["Lucas Hernández", "France"], ["Eduardo Camavinga", "France"], ["Ibrahima Konaté", "France"], ["Dayot Upamecano", "France"], ["Jules Koundé", "France"], ["Adrien Rabiot", "France"], ["Marcus Thuram", "France"], ["Kingsley Coman", "France"], ["Désiré Doué", "France"], ["Michael Olise", "France"], ["N'Golo Kanté", "France"], ["Manu Koné", "France"], ["Warren Zaïre-Emery", "France"], ["Benjamin Pavard", "France"], ["Wesley Fofana", "France"], ["Mattéo Guendouzi", "France"],
  // Germany
  ["Joshua Kimmich", "Germany"], ["Florian Wirtz", "Germany"], ["Jamal Musiala", "Germany"], ["Kai Havertz", "Germany"], ["Antonio Rüdiger", "Germany"], ["Niclas Füllkrug", "Germany"], ["Leroy Sané", "Germany"], ["İlkay Gündoğan", "Germany"], ["Manuel Neuer", "Germany"], ["Marc-André ter Stegen", "Germany"], ["Robert Andrich", "Germany"], ["Pascal Groß", "Germany"], ["Aleksandar Pavlović", "Germany"], ["David Raum", "Germany"], ["Jonathan Tah", "Germany"], ["Nico Schlotterbeck", "Germany"], ["Maximilian Mittelstädt", "Germany"], ["Deniz Undav", "Germany"], ["Karim Adeyemi", "Germany"], ["Jamie Leweling", "Germany"], ["Nick Woltemade", "Germany"], ["Angelo Stiller", "Germany"],
  // Spain
  ["Lamine Yamal", "Spain"], ["Rodri", "Spain"], ["Pedri", "Spain"], ["Gavi", "Spain"], ["Álvaro Morata", "Spain"], ["Nico Williams", "Spain"], ["Dani Olmo", "Spain"], ["Mikel Oyarzabal", "Spain"], ["Unai Simón", "Spain"], ["Marc Cucurella", "Spain"], ["Dani Carvajal", "Spain"], ["Robin Le Normand", "Spain"], ["Aymeric Laporte", "Spain"], ["Mikel Merino", "Spain"], ["Martín Zubimendi", "Spain"], ["Fabián Ruiz", "Spain"], ["Ferran Torres", "Spain"], ["Álex Baena", "Spain"], ["Fermín López", "Spain"], ["Pau Cubarsí", "Spain"], ["Dean Huijsen", "Spain"], ["Pedro Porro", "Spain"], ["Yéremy Pino", "Spain"],
  // Brazil
  ["Vinícius Júnior", "Brazil"], ["Rodrygo", "Brazil"], ["Raphinha", "Brazil"], ["Endrick", "Brazil"], ["Neymar", "Brazil"], ["Casemiro", "Brazil"], ["Alisson", "Brazil"], ["Bruno Guimarães", "Brazil"], ["Gabriel Magalhães", "Brazil"], ["Gabriel Jesus", "Brazil"], ["Marquinhos", "Brazil"], ["Éder Militão", "Brazil"], ["Lucas Paquetá", "Brazil"], ["Vanderson", "Brazil"], ["Wesley", "Brazil"], ["Estêvão", "Brazil"], ["João Pedro", "Brazil"], ["Matheus Cunha", "Brazil"], ["Andreas Pereira", "Brazil"], ["Bento", "Brazil"], ["Danilo", "Brazil"], ["Savinho", "Brazil"],
  // Portugal
  ["Cristiano Ronaldo", "Portugal"], ["Bruno Fernandes", "Portugal"], ["Bernardo Silva", "Portugal"], ["Rafael Leão", "Portugal"], ["Vitinha", "Portugal"], ["Rúben Dias", "Portugal"], ["João Cancelo", "Portugal"], ["Diogo Jota", "Portugal"], ["João Félix", "Portugal"], ["Nuno Mendes", "Portugal"], ["Diogo Costa", "Portugal"], ["Pedro Neto", "Portugal"], ["João Palhinha", "Portugal"], ["Rúben Neves", "Portugal"], ["Gonçalo Ramos", "Portugal"], ["Pepe", "Portugal"], ["Francisco Conceição", "Portugal"], ["Geovany Quenda", "Portugal"], ["António Silva", "Portugal"], ["Renato Veiga", "Portugal"],
  // Argentina
  ["Lionel Messi", "Argentina"], ["Julián Álvarez", "Argentina"], ["Lautaro Martínez", "Argentina"], ["Ángel Di María", "Argentina"], ["Rodrigo De Paul", "Argentina"], ["Alexis Mac Allister", "Argentina"], ["Enzo Fernández", "Argentina"], ["Emiliano Martínez", "Argentina"], ["Cristian Romero", "Argentina"], ["Nicolás Otamendi", "Argentina"], ["Nicolás Tagliafico", "Argentina"], ["Nahuel Molina", "Argentina"], ["Leandro Paredes", "Argentina"], ["Giovani Lo Celso", "Argentina"], ["Paulo Dybala", "Argentina"], ["Nico Paz", "Argentina"], ["Franco Mastantuono", "Argentina"], ["Alejandro Garnacho", "Argentina"], ["Lisandro Martínez", "Argentina"], ["Thiago Almada", "Argentina"],
  // Netherlands
  ["Virgil van Dijk", "Netherlands"], ["Memphis Depay", "Netherlands"], ["Cody Gakpo", "Netherlands"], ["Frenkie de Jong", "Netherlands"], ["Xavi Simons", "Netherlands"], ["Denzel Dumfries", "Netherlands"], ["Tijjani Reijnders", "Netherlands"], ["Teun Koopmeiners", "Netherlands"], ["Bart Verbruggen", "Netherlands"], ["Nathan Aké", "Netherlands"], ["Matthijs de Ligt", "Netherlands"], ["Jeremie Frimpong", "Netherlands"], ["Ryan Gravenberch", "Netherlands"], ["Donyell Malen", "Netherlands"], ["Wout Weghorst", "Netherlands"], ["Brian Brobbey", "Netherlands"], ["Micky van de Ven", "Netherlands"], ["Jurriën Timber", "Netherlands"],
  // Belgium
  ["Kevin De Bruyne", "Belgium"], ["Romelu Lukaku", "Belgium"], ["Jérémy Doku", "Belgium"], ["Maxim De Cuyper", "Belgium"], ["Leandro Trossard", "Belgium"], ["Youri Tielemans", "Belgium"], ["Loïs Openda", "Belgium"], ["Thibaut Courtois", "Belgium"], ["Koen Casteels", "Belgium"], ["Charles De Ketelaere", "Belgium"], ["Amadou Onana", "Belgium"], ["Arthur Vermeeren", "Belgium"], ["Zeno Debast", "Belgium"], ["Wout Faes", "Belgium"], ["Timothy Castagne", "Belgium"], ["Dodi Lukebakio", "Belgium"], ["Johan Bakayoko", "Belgium"], ["Nicolas Raskin", "Belgium"],
  // Croatia
  ["Luka Modrić", "Croatia"], ["Joško Gvardiol", "Croatia"], ["Mateo Kovačić", "Croatia"], ["Marcelo Brozović", "Croatia"], ["Andrej Kramarić", "Croatia"], ["Ivan Perišić", "Croatia"], ["Mario Pašalić", "Croatia"], ["Luka Sučić", "Croatia"], ["Dominik Livaković", "Croatia"], ["Josip Stanišić", "Croatia"], ["Lovro Majer", "Croatia"], ["Petar Sučić", "Croatia"], ["Martin Baturina", "Croatia"],
  // Uruguay
  ["Federico Valverde", "Uruguay"], ["Darwin Núñez", "Uruguay"], ["Ronald Araújo", "Uruguay"], ["Mathías Olivera", "Uruguay"], ["Rodrigo Bentancur", "Uruguay"], ["Manuel Ugarte", "Uruguay"], ["Giorgian de Arrascaeta", "Uruguay"], ["Facundo Pellistri", "Uruguay"], ["Maximiliano Araújo", "Uruguay"], ["Nahitan Nández", "Uruguay"], ["Sergio Rochet", "Uruguay"], ["José María Giménez", "Uruguay"],
  // Norway
  ["Erling Haaland", "Norway"], ["Martin Ødegaard", "Norway"], ["Alexander Sørloth", "Norway"], ["Antonio Nusa", "Norway"], ["Sander Berge", "Norway"], ["Patrick Berg", "Norway"], ["Kristoffer Ajer", "Norway"], ["Julian Ryerson", "Norway"], ["Leo Østigård", "Norway"], ["Fredrik Aursnes", "Norway"], ["Oscar Bobb", "Norway"], ["Ørjan Nyland", "Norway"],
  // Switzerland
  ["Granit Xhaka", "Switzerland"], ["Manuel Akanji", "Switzerland"], ["Breel Embolo", "Switzerland"], ["Nico Elvedi", "Switzerland"], ["Yann Sommer", "Switzerland"], ["Remo Freuler", "Switzerland"], ["Dan Ndoye", "Switzerland"], ["Xherdan Shaqiri", "Switzerland"], ["Zeki Amdouni", "Switzerland"], ["Fabian Rieder", "Switzerland"], ["Ricardo Rodríguez", "Switzerland"], ["Silvan Widmer", "Switzerland"],
  // United States
  ["Christian Pulisic", "United States"], ["Weston McKennie", "United States"], ["Gio Reyna", "United States"], ["Folarin Balogun", "United States"], ["Yunus Musah", "United States"], ["Tyler Adams", "United States"], ["Tim Weah", "United States"], ["Antonee Robinson", "United States"], ["Matt Turner", "United States"], ["Sergiño Dest", "United States"], ["Chris Richards", "United States"], ["Brenden Aaronson", "United States"], ["Ricardo Pepi", "United States"], ["Gianluca Busio", "United States"], ["Malik Tillman", "United States"],
  // Mexico
  ["Edson Álvarez", "Mexico"], ["Hirving Lozano", "Mexico"], ["Santiago Giménez", "Mexico"], ["Raúl Jiménez", "Mexico"], ["Guillermo Ochoa", "Mexico"], ["Luis Chávez", "Mexico"], ["Orbelín Pineda", "Mexico"], ["César Montes", "Mexico"], ["Jorge Sánchez", "Mexico"], ["Julián Quiñones", "Mexico"], ["Alexis Vega", "Mexico"], ["Luis Malagón", "Mexico"],
  // Canada
  ["Alphonso Davies", "Canada"], ["Jonathan David", "Canada"], ["Tajon Buchanan", "Canada"], ["Stephen Eustáquio", "Canada"], ["Cyle Larin", "Canada"], ["Alistair Johnston", "Canada"], ["Jacob Shaffelburg", "Canada"], ["Ismaël Koné", "Canada"], ["Moïse Bombito", "Canada"], ["Maxime Crépeau", "Canada"],
  // Colombia
  ["James Rodríguez", "Colombia"], ["Luis Díaz", "Colombia"], ["Jhon Durán", "Colombia"], ["Jefferson Lerma", "Colombia"], ["Richard Ríos", "Colombia"], ["Jhon Arias", "Colombia"], ["Daniel Muñoz", "Colombia"], ["Davinson Sánchez", "Colombia"], ["Camilo Vargas", "Colombia"], ["Luis Sinisterra", "Colombia"], ["Rafael Santos Borré", "Colombia"],
  // Ecuador
  ["Moisés Caicedo", "Ecuador"], ["Piero Hincapié", "Ecuador"], ["Pervis Estupiñán", "Ecuador"], ["Kendry Páez", "Ecuador"], ["Enner Valencia", "Ecuador"], ["Gonzalo Plata", "Ecuador"], ["Hernán Galíndez", "Ecuador"], ["Willian Pacho", "Ecuador"], ["Jeremy Sarmiento", "Ecuador"],
  // Japan
  ["Takefusa Kubo", "Japan"], ["Kaoru Mitoma", "Japan"], ["Wataru Endo", "Japan"], ["Daichi Kamada", "Japan"], ["Takehiro Tomiyasu", "Japan"], ["Ritsu Doan", "Japan"], ["Ayase Ueda", "Japan"], ["Hidemasa Morita", "Japan"], ["Takumi Minamino", "Japan"], ["Junya Ito", "Japan"], ["Zion Suzuki", "Japan"], ["Ko Itakura", "Japan"],
  // South Korea
  ["Son Heung-min", "South Korea"], ["Kim Min-jae", "South Korea"], ["Lee Kang-in", "South Korea"], ["Hwang Hee-chan", "South Korea"], ["Cho Gue-sung", "South Korea"], ["Hwang In-beom", "South Korea"], ["Lee Jae-sung", "South Korea"], ["Kim Jin-su", "South Korea"], ["Oh Hyeon-gyu", "South Korea"],
  // Australia
  ["Jackson Irvine", "Australia"], ["Mathew Ryan", "Australia"], ["Riley McGree", "Australia"], ["Craig Goodwin", "Australia"], ["Jordan Bos", "Australia"], ["Connor Metcalfe", "Australia"], ["Martin Boyle", "Australia"], ["Harry Souttar", "Australia"], ["Nestory Irankunda", "Australia"],
  // Scotland
  ["Scott McTominay", "Scotland"], ["Andrew Robertson", "Scotland"], ["John McGinn", "Scotland"], ["Billy Gilmour", "Scotland"], ["Kieran Tierney", "Scotland"], ["Che Adams", "Scotland"], ["Ryan Christie", "Scotland"], ["Lewis Ferguson", "Scotland"], ["Angus Gunn", "Scotland"], ["Ben Doak", "Scotland"], ["Lyndon Dykes", "Scotland"],
  // Sweden
  ["Alexander Isak", "Sweden"], ["Viktor Gyökeres", "Sweden"], ["Dejan Kulusevski", "Sweden"], ["Emil Forsberg", "Sweden"], ["Anthony Elanga", "Sweden"], ["Victor Lindelöf", "Sweden"], ["Lutsharel Geertruida", "Sweden"], ["Yasin Ayari", "Sweden"],
  // Turkey
  ["Hakan Çalhanoğlu", "Turkey"], ["Arda Güler", "Turkey"], ["Kenan Yıldız", "Turkey"], ["Kaan Ayhan", "Turkey"], ["Ferdi Kadıoğlu", "Turkey"], ["Orkun Kökçü", "Turkey"], ["Merih Demiral", "Turkey"], ["Cenk Tosun", "Turkey"], ["Yusuf Akçiçek", "Turkey"], ["Can Uzun", "Turkey"],
  // Egypt
  ["Mohamed Salah", "Egypt"], ["Omar Marmoush", "Egypt"], ["Mohamed Elneny", "Egypt"], ["Trezeguet", "Egypt"], ["Mostafa Mohamed", "Egypt"], ["Mohamed Abdelmonem", "Egypt"], ["Mohamed El-Shenawy", "Egypt"],
  // Morocco
  ["Achraf Hakimi", "Morocco"], ["Hakim Ziyech", "Morocco"], ["Youssef En-Nesyri", "Morocco"], ["Brahim Díaz", "Morocco"], ["Azzedine Ounahi", "Morocco"], ["Noussair Mazraoui", "Morocco"], ["Nayef Aguerd", "Morocco"], ["Sofyan Amrabat", "Morocco"], ["Bilal El Khannouss", "Morocco"], ["Eliesse Ben Seghir", "Morocco"], ["Yassine Bounou", "Morocco"],
  // Senegal
  ["Sadio Mané", "Senegal"], ["Kalidou Koulibaly", "Senegal"], ["Nicolas Jackson", "Senegal"], ["Ismaïla Sarr", "Senegal"], ["Pape Matar Sarr", "Senegal"], ["Iliman Ndiaye", "Senegal"], ["Édouard Mendy", "Senegal"], ["Idrissa Gueye", "Senegal"], ["Lamine Camara", "Senegal"], ["Habib Diarra", "Senegal"],
  // Algeria
  ["Riyad Mahrez", "Algeria"], ["Ismaël Bennacer", "Algeria"], ["Houssem Aouar", "Algeria"], ["Saïd Benrahma", "Algeria"], ["Ramy Bensebaini", "Algeria"], ["Amine Gouiri", "Algeria"], ["Mohamed Amoura", "Algeria"],
  // Ghana
  ["Mohammed Kudus", "Ghana"], ["Thomas Partey", "Ghana"], ["Jordan Ayew", "Ghana"], ["Antoine Semenyo", "Ghana"], ["Kamaldeen Sulemana", "Ghana"], ["Tariq Lamptey", "Ghana"], ["Ernest Nuamah", "Ghana"],
  // Iran
  ["Mehdi Taremi", "Iran"], ["Sardar Azmoun", "Iran"], ["Alireza Jahanbakhsh", "Iran"], ["Saman Ghoddos", "Iran"], ["Mehdi Ghayedi", "Iran"], ["Alireza Beiranvand", "Iran"],
  // Ivory Coast
  ["Sébastien Haller", "Ivory Coast"], ["Franck Kessié", "Ivory Coast"], ["Nicolas Pépé", "Ivory Coast"], ["Simon Adingra", "Ivory Coast"], ["Ibrahim Sangaré", "Ivory Coast"], ["Evan Ndicka", "Ivory Coast"], ["Amad Diallo", "Ivory Coast"], ["Oumar Diakité", "Ivory Coast"],
  // Austria
  ["David Alaba", "Austria"], ["Marko Arnautović", "Austria"], ["Marcel Sabitzer", "Austria"], ["Christoph Baumgartner", "Austria"], ["Konrad Laimer", "Austria"], ["Nicolas Seiwald", "Austria"], ["Patrick Wimmer", "Austria"], ["Romano Schmid", "Austria"],
  // Saudi Arabia
  ["Salem Al-Dawsari", "Saudi Arabia"], ["Firas Al-Buraikan", "Saudi Arabia"], ["Mohamed Kanno", "Saudi Arabia"], ["Saud Abdulhamid", "Saudi Arabia"], ["Salman Al-Faraj", "Saudi Arabia"],
  // Qatar
  ["Akram Afif", "Qatar"], ["Hassan Al-Haydos", "Qatar"], ["Almoez Ali", "Qatar"], ["Abdulaziz Hatem", "Qatar"],
  // South Africa
  ["Teboho Mokoena", "South Africa"], ["Themba Zwane", "South Africa"], ["Lyle Foster", "South Africa"], ["Percy Tau", "South Africa"], ["Relebohile Mofokeng", "South Africa"], ["Ronwen Williams", "South Africa"],
  // Czech Republic
  ["Patrik Schick", "Czech Republic"], ["Tomáš Souček", "Czech Republic"], ["Adam Hložek", "Czech Republic"], ["Lukáš Provod", "Czech Republic"], ["Antonín Barák", "Czech Republic"], ["Vladimír Coufal", "Czech Republic"], ["Pavel Šulc", "Czech Republic"],
  // Paraguay
  ["Miguel Almirón", "Paraguay"], ["Antonio Sanabria", "Paraguay"], ["Julio Enciso", "Paraguay"], ["Diego Gómez", "Paraguay"], ["Omar Alderete", "Paraguay"],
  // Tunisia
  ["Hannibal Mejbri", "Tunisia"], ["Ellyes Skhiri", "Tunisia"], ["Aïssa Laïdouni", "Tunisia"], ["Youssef Msakni", "Tunisia"],
  // DR Congo
  ["Yoane Wissa", "DR Congo"], ["Cédric Bakambu", "DR Congo"], ["Chancel Mbemba", "DR Congo"], ["Théo Bongonda", "DR Congo"], ["Arthur Masuaku", "DR Congo"],
  // Iraq
  ["Aymen Hussein", "Iraq"], ["Zidane Iqbal", "Iraq"], ["Ali Jasim", "Iraq"],
  // Bosnia and Herzegovina
  ["Edin Džeko", "Bosnia and Herzegovina"], ["Ermedin Demirović", "Bosnia and Herzegovina"],
  // Uzbekistan
  ["Eldor Shomurodov", "Uzbekistan"], ["Abbosbek Fayzullaev", "Uzbekistan"],
  // Cape Verde
  ["Ryan Mendes", "Cape Verde"], ["Jovane Cabral", "Cape Verde"],
  // Panama
  ["Adalberto Carrasquilla", "Panama"], ["José Fajardo", "Panama"], ["Ismael Díaz", "Panama"],
  // Haiti
  ["Frantzdy Pierrot", "Haiti"], ["Duckens Nazon", "Haiti"],
  // Jordan
  ["Musa Al-Taamari", "Jordan"], ["Yazan Al-Naimat", "Jordan"], ["Nizar Al-Rashdan", "Jordan"],
  // New Zealand
  ["Chris Wood", "New Zealand"], ["Marko Stamenić", "New Zealand"], ["Ben Old", "New Zealand"],
  // Curaçao
  ["Leandro Bacuna", "Curaçao"], ["Juninho Bacuna", "Curaçao"], ["Tahith Chong", "Curaçao"], ["Cuco Martina", "Curaçao"],
];
for (const [n, c] of EXTRA) add(n, c);

players.sort((a, b) => a.n.localeCompare(b.n));
fs.writeFileSync(path.join(__dirname, "players.json"), JSON.stringify(players));
console.log("players.json:", players.length, "entries");

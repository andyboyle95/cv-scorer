// Curated WC2026 player → country map for best-effort screenshot import.
// Keys are lower-cased, accent-stripped distinctive name fragments (usually the
// shirt surname). Deliberately limited to well-known players with STABLE
// national-team affiliations and DISTINCTIVE names — ambiguous common surnames
// (Rodriguez, Silva, Martinez, Kim, Lee, Garcia, Diaz, Williams, James, Adams…)
// are omitted to avoid wrong matches. Unmatched players fall back to paste.
//
// Matching is prefix-aware so truncated cards ("Bruno Fernand…") still resolve.
// To extend: add distinctive names under the relevant country.

export const WC26_PLAYERS: Record<string, string[]> = {
  England: ["bellingham", "saka", "foden", "rice", "palmer", "pickford", "rashford", "maddison", "guehi", "mainoo", "trippier", "konsa", "watkins"],
  France: ["mbappe", "griezmann", "dembele", "tchouameni", "camavinga", "saliba", "konate", "maignan", "kounde", "rabiot", "thuram", "barcola", "upamecano", "kolo muani", "doue"],
  Germany: ["kimmich", "wirtz", "musiala", "havertz", "gundogan", "rudiger", "neuer", "fullkrug", "andrich", "mittelstadt", "kleindienst", "undav", "adeyemi"],
  Spain: ["oyarzabal", "yamal", "pedri", "gavi", "morata", "cucurella", "carvajal", "merino", "zubimendi", "le normand", "laporte"],
  Brazil: ["raphinha", "vinicius", "rodrygo", "neymar", "casemiro", "marquinhos", "magalhaes", "alisson", "militao", "paqueta", "endrick", "guimaraes"],
  Portugal: ["bruno fernandes", "ronaldo", "bernardo", "leao", "vitinha", "cancelo", "palhinha", "nuno mendes", "joao felix", "diogo jota"],
  Argentina: ["messi", "lautaro", "di maria", "de paul", "mac allister", "enzo fernandez", "dybala", "otamendi", "tagliafico", "molina", "paredes"],
  Netherlands: ["depay", "gakpo", "xavi simons", "frenkie", "van dijk", "dumfries", "koopmeiners", "reijnders", "weghorst", "malen", "verbruggen"],
  Belgium: ["de bruyne", "lukaku", "doku", "trossard", "tielemans", "openda", "courtois", "casteels", "de ketelaere", "vermeeren"],
  Croatia: ["modric", "kovacic", "brozovic", "gvardiol", "kramaric", "perisic", "pasalic", "sucic", "budimir", "livakovic", "majer", "stanisic"],
  Uruguay: ["olivera", "nunez", "valverde", "bentancur", "araujo", "pellistri", "ugarte", "arrascaeta", "vecino"],
  Norway: ["haaland", "odegaard", "sorloth", "nusa", "berge", "ryerson", "ostigard", "aursnes", "moller wolfe", "thorstvedt"],
  Switzerland: ["elvedi", "xhaka", "sommer", "akanji", "embolo", "freuler", "ndoye", "shaqiri", "amdouni", "aebischer", "widmer"],
  Colombia: ["luis diaz", "lerma", "borre", "lucumi", "sinisterra", "borja", "ospina", "cuadrado"],
  Ecuador: ["caicedo", "hincapie", "estupinan", "plata", "galindez", "paez", "preciado", "sarmiento"],
  Canada: ["davies", "buchanan", "eustaquio", "larin", "crepeau", "johnston", "laryea", "osorio", "hoilett", "bombito"],
  Mexico: ["lozano", "antuna", "gallardo", "ochoa", "pineda", "alvarado", "huerta"],
  "United States": ["pulisic", "mckennie", "reyna", "balogun", "musah", "weah", "turner", "aaronson", "ream"],
  Japan: ["mitoma", "kubo", "kamada", "tomiyasu", "minamino", "ueda", "doan", "morita", "nakamura"],
  Senegal: ["mane", "koulibaly", "jackson", "sabaly", "ndiaye", "gueye"],
  Morocco: ["hakimi", "ziyech", "en-nesyri", "ounahi", "mazraoui", "aguerd", "bounou", "boufal"],
  Australia: ["irvine", "goodwin", "mclaren", "duke", "boyle", "metcalfe", "velupillay"],
  Scotland: ["mctominay", "robertson", "mcginn", "gilmour", "tierney", "christie", "ferguson", "dykes"],
  Iran: ["azmoun", "taremi", "jahanbakhsh", "ansarifard", "ghoddos"],
  "South Korea": ["heung-min", "hwang hee-chan", "kim min-jae", "lee kang-in", "cho gue-sung"],
  Austria: ["alaba", "arnautovic", "sabitzer", "baumgartner", "laimer", "gregoritsch", "seiwald"],
  Egypt: ["salah", "elneny", "trezeguet", "hegazi", "marmoush"],
  Ghana: ["kudus", "ayew", "partey", "semenyo", "lamptey", "sulemana"],
  Uzbekistan: ["shomurodov", "masharipov"],
  "DR Congo": ["mbemba", "wissa", "bakambu", "masuaku"],
  Tunisia: ["msakni", "skhiri", "laidouni"],
  Sweden: ["isak", "gyokeres", "kulusevski", "forsberg", "lindelof", "elanga"],
  Paraguay: ["almiron", "sanabria", "enciso"],
  Turkey: ["calhanoglu", "guler", "akturkoglu", "yildiz", "demiral", "kokcu", "kadioglu"],
  Algeria: ["mahrez", "bennacer", "bounedjah", "slimani"],
  "Saudi Arabia": ["al-dawsari", "al-buraikan", "kanno"],
  Qatar: ["afif", "al-haydos", "muntari"],
  "South Africa": ["mokoena", "zwane", "rayners", "makgopa", "mofokeng", "appollis"],
  "Cape Verde": ["semedo", "tavares"],
  Panama: ["fajardo", "carrasquilla", "barcenas", "murillo"],
  Haiti: ["pierrot", "bazile"],
  Iraq: ["aymen hussein", "bayesh"],
  "Bosnia and Herzegovina": ["dzeko", "demirovic", "tabakovic"],
  "Czech Republic": ["schick", "soucek", "hlozek", "provod", "barak", "coufal", "sulc"],
  Jordan: ["al-naimat", "al-tamari", "olwan"],
  "New Zealand": ["stamenic", "garbett"],
};

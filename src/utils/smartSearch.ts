// Búsqueda inteligente compartida: ignora acentos/mayúsculas, plurales, sinónimos y errores de escritura leves.
export const normalizeText = (str: string) =>
  (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const SYNONYMS: Record<string, string[]> = {
  licra: ['legging', 'malla'], lycra: ['legging', 'malla'], mallas: ['legging'], leggins: ['legging'],
  tenis: ['zapatos', 'tenis'], zapatillas: ['zapatos', 'tenis'], calzado: ['zapatos'], tacos: ['zapatos'], botines: ['zapatos'],
  camisa: ['franela', 'camiseta'], camiseta: ['franela', 'camiseta'], playera: ['franela', 'camiseta'], remera: ['franela', 'camiseta'],
  jersey: ['uniforme', 'franela'], camisola: ['uniforme'], equipo: ['uniforme'],
  sueter: ['sudadera', 'hoodie'], buzo: ['sudadera', 'hoodie'], capucha: ['hoodie'],
  chandal: ['conjunto', 'jogger'], pans: ['jogger', 'pantalon'], pants: ['jogger', 'pantalon'],
  bikini: ['bano'], vestido: ['bano'], natacion: ['bano'], piscina: ['bano'],
  calcetines: ['medias'], calcetas: ['medias'], cachucha: ['gorra'], gorro: ['gorra'],
  bolso: ['mochilas', 'bolso'], morral: ['mochilas'], maleta: ['mochilas', 'bolso'], cartera: ['bolso'],
  sosten: ['top', 'sujetador'], bra: ['top', 'sujetador'], yoga: ['top', 'legging', 'esterilla'],
  gym: ['franela', 'short', 'guantes'], running: ['franela', 'tenis', 'short'], correr: ['running'],
  futbol: ['uniforme', 'zapatos'], beisbol: ['uniforme'], basket: ['baloncesto'], baloncesto: ['uniforme', 'short', 'zapatos'],
  ciclismo: ['uniforme', 'guantes'], pesas: ['guantes', 'cinturon'], termo: ['botella'], cantimplora: ['botella'],
};

const levenshtein = (a: string, b: string) => {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
};

/** true si todas las palabras de la consulta coinciden con el texto. */
export const smartMatch = (query: string, target: string): boolean => {
  const q = normalizeText(query);
  if (!q) return true;
  const text = normalizeText(target);
  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  return q.split(/\s+/).filter(Boolean).every((token) => {
    const base = token.length > 3 ? token.replace(/(es|s)$/, '') : token;
    const options = [token, base, ...(SYNONYMS[token] || []), ...(SYNONYMS[base] || [])];
    if (options.some((o) => text.includes(o))) return true;
    if (token.length >= 4) return words.some((w) => Math.abs(w.length - token.length) <= 2 && levenshtein(w, token) <= 1);
    return false;
  });
};
export const FESTIVAL_FERIA_NAME = "Festival Estudiantil de las Artes";

// Máximos oficiales del PDF: B (Jueces/Exposición) y C (Comité/Escrito).
export const PRONAFECYT_CODE_MAX = {
  F8B: 40, F8C: 64,
  F9B: 40, F9C: 78,
  F10B: 40, F10C: 98,
  F11B: 40, F11C: 54,
  F12B: 40, F12C: 54,
  F13B: 100
};

// Máximo real (indicadores × 3) de cada formulario C del escrito.
export const PRONAFECYT_C_RAW_MAX = {
  F8C: 78, F9C: 90, F10C: 108, F11C: 63, F12C: 63
};

// expo = Exposición, escrito = Documento escrito/bitácora.
export const EXPOTECNICA_MAX = {
  "DESAFIO STEAM": { expo: 111, escrito: 105 },
  "EMPRENDIMIENTO E INNOVACION": { expo: 51, escrito: 72 }
};

export function calcAverage(judges) {
  const voted = judges
    .map((judge) => ({ ...judge, sum: Number(judge.sum) }))
    .filter((judge) => judge.voted && Number.isFinite(judge.sum));
  return voted.length ? voted.reduce((total, judge) => total + judge.sum, 0) / voted.length : 0;
}

export function calcFinalScore(expoVoted, expoAvg, escritoVoted, escritoAvg) {
  if (expoVoted > 0 && escritoVoted > 0) return expoAvg * 0.5 + escritoAvg * 0.5;
  if (expoVoted > 0) return expoAvg;
  return escritoAvg;
}

export function calcPronatecytFinalScore(bCode, expoPts, escritoPts) {
  const bMax = PRONAFECYT_CODE_MAX[bCode] || 40;
  const cCode = bCode ? bCode.replace("B", "C") : "";
  const cRawMax = PRONAFECYT_C_RAW_MAX[cCode] || 0;
  if (cRawMax > 0) {
    return (expoPts / bMax) * 50 + (escritoPts / cRawMax) * 50;
  }
  return expoPts;
}

export function calcExpotecnicaFinalScore(category, expoPts, escritoPts) {
  const max = EXPOTECNICA_MAX[category];
  if (!max) return expoPts;
  const expoPct = max.expo > 0 ? (expoPts / max.expo) * 50 : 0;
  const escritoPct = max.escrito > 0 ? (escritoPts / max.escrito) * 50 : 0;
  return expoPct + escritoPct;
}

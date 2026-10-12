import { tokenizeCode, generateNGrams } from './tokenizer.js';

// DJB2 Hash function for n-gram strings
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFF; // Keep 28 bits
  }
  return hash;
}

// Winnowing algorithm to generate robust code fingerprints
export function winnow(ngrams, windowSize = 4) {
  if (!ngrams || ngrams.length === 0) return [];

  const hashes = ngrams.map(ng => ({
    hash: hashString(ng.text),
    startLine: ng.startLine,
    endLine: ng.endLine,
    text: ng.text
  }));

  if (hashes.length < windowSize) {
    let minItem = hashes[0];
    for (const item of hashes) {
      if (item.hash <= minItem.hash) minItem = item;
    }
    return [minItem];
  }

  const fingerprints = [];
  let minIndex = -1;

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    const window = hashes.slice(i, i + windowSize);
    let minInWindow = window[0];
    let minPosInWindow = 0;

    for (let j = 1; j < window.length; j++) {
      if (window[j].hash <= minInWindow.hash) {
        minInWindow = window[j];
        minPosInWindow = j;
      }
    }

    const absoluteIndex = i + minPosInWindow;
    if (absoluteIndex !== minIndex) {
      fingerprints.push(minInWindow);
      minIndex = absoluteIndex;
    }
  }

  return fingerprints;
}

// Generate fingerprints for both Literal and Structural token streams
export function getDualFingerprints(code, k = 4, w = 4) {
  const tokens = tokenizeCode(code);
  
  // 1. Literal NGrams (uses raw identifiers so renamed variables differ)
  const literalTokens = tokens.map(t => ({
    ...t,
    value: t.type === 'ID' ? t.raw.toLowerCase() : t.value
  }));
  const literalNGrams = generateNGrams(literalTokens, k);
  const literalFingerprints = winnow(literalNGrams, w);

  // 2. Structural NGrams (all IDs normalized to $ID$ to detect structure)
  const structuralTokens = tokens.map(t => ({
    ...t,
    value: t.type === 'ID' ? '$ID$' : t.value
  }));
  const structuralNGrams = generateNGrams(structuralTokens, k);
  const structuralFingerprints = winnow(structuralNGrams, w);

  return {
    tokens,
    literalFingerprints,
    structuralFingerprints
  };
}

function computeSetSimilarity(setA, setB) {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const h of setA) {
    if (setB.has(h)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  const jaccard = union > 0 ? intersection / union : 0;
  const containment = Math.max(intersection / setA.size, intersection / setB.size);
  return Math.round((jaccard * 0.4 + containment * 0.6) * 100);
}

// Compare two code files using hybrid literal + structural winnowing
export function compareCode(codeA, codeB) {
  const dataA = getDualFingerprints(codeA);
  const dataB = getDualFingerprints(codeB);

  const litHashesA = new Set(dataA.literalFingerprints.map(f => f.hash));
  const litHashesB = new Set(dataB.literalFingerprints.map(f => f.hash));

  const structHashesA = new Set(dataA.structuralFingerprints.map(f => f.hash));
  const structHashesB = new Set(dataB.structuralFingerprints.map(f => f.hash));

  const literalScore = computeSetSimilarity(litHashesA, litHashesB);
  const structuralScore = computeSetSimilarity(structHashesA, structHashesB);

  // Overall Score is weighted: 50% literal, 50% structural
  // If literal is high (>75%), both agree -> direct High Plagiarism
  // If structural is high (>70%) but literal is lower (<70%), that signals renamed variables / borderline obfuscation!
  let combinedScore = Math.round(literalScore * 0.55 + structuralScore * 0.45);

  const matchedLinesA = [];
  dataA.literalFingerprints.forEach(fp => {
    if (litHashesB.has(fp.hash)) {
      matchedLinesA.push({ startLine: fp.startLine, endLine: fp.endLine });
    }
  });

  return {
    similarity: Math.min(100, Math.max(0, combinedScore)),
    literalScore,
    structuralScore,
    intersectionCount: litHashesA.size > 0 ? Math.round(litHashesA.size * (literalScore / 100)) : 0,
    matchedLinesA
  };
}

// Compare submission against past submissions
export function runTier1Check(newCode, pastSubmissions = [], options = {}) {
  const lowThreshold = options.lowThreshold || 35;
  const highThreshold = options.highThreshold || 75;

  let maxSimilarity = 0;
  let mostSimilarSubmission = null;
  const comparisonResults = [];

  for (const past of pastSubmissions) {
    if (!past.code) continue;
    const comparison = compareCode(newCode, past.code);

    comparisonResults.push({
      submissionId: past.id,
      studentName: past.studentName,
      rollNo: past.rollNo,
      similarity: comparison.similarity,
      literalScore: comparison.literalScore,
      structuralScore: comparison.structuralScore,
      matchedLines: comparison.matchedLinesA
    });

    if (comparison.similarity > maxSimilarity) {
      maxSimilarity = comparison.similarity;
      mostSimilarSubmission = {
        ...past,
        similarity: comparison.similarity,
        literalScore: comparison.literalScore,
        structuralScore: comparison.structuralScore,
        matchedLines: comparison.matchedLinesA
      };
    }
  }

  let verdict = 'Clean Submission';
  let status = 'CLEAN';
  let requiresTier2 = false;

  if (maxSimilarity >= highThreshold) {
    verdict = 'High Plagiarism Detected';
    status = 'HIGH_SIMILARITY';
    requiresTier2 = false;
  } else if (maxSimilarity >= lowThreshold) {
    verdict = 'Borderline Similarity';
    status = 'BORDERLINE';
    requiresTier2 = true; // Triggers Tier-2 Gemini AI Check!
  } else {
    verdict = 'Low Similarity (Unique)';
    status = 'CLEAN';
    requiresTier2 = false;
  }

  return {
    score: maxSimilarity,
    verdict,
    status,
    requiresTier2,
    mostSimilarSubmission,
    allComparisons: comparisonResults
  };
}

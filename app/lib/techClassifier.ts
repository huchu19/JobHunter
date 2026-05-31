interface TechClassification {
  isTech: boolean;
  score: number;
  matchedTerms: string[];
}

const SUFFIX_SCORES: Record<string, number> = {
  technologies: 4,
  software: 4,
  tech: 3,
  digital: 3,
  labs: 3,
  data: 2,
  cyber: 3,
  cloud: 3,
  platform: 2,
  systems: 2,
  solutions: 2,
  intelligence: 2,
  analytics: 2,
  computing: 2,
};

const WORD_SCORES: Record<string, number> = {
  saas: 3,
  api: 2,
  fintech: 3,
  devops: 3,
  "machine learning": 3,
  blockchain: 2,
  iot: 2,
  robotics: 2,
  "deep learning": 3,
};

// Additional single-letter/short acronyms that need special handling
const ACRONYM_SCORES: Record<string, number> = {
  ai: 3,
};

export function classifyTech(companyName: string): TechClassification {
  const normalized = companyName.toLowerCase().trim();
  let score = 0;
  const matchedTerms: string[] = [];

  // Check word scores (with word boundaries)
  for (const [term, points] of Object.entries(WORD_SCORES)) {
    const regex = new RegExp(`\\b${term}\\b`);
    if (regex.test(normalized)) {
      score += points;
      matchedTerms.push(term);
    }
  }

  // Check acronym scores (less strict matching for compound words like PolyAI)
  // But avoid matching "Airways" which contains "ai" in the middle
  for (const [acronym, points] of Object.entries(ACRONYM_SCORES)) {
    if (acronym === "ai") {
      // Match standalone "ai" or as part of compound like "PolyAI"
      if (/\bai\b/.test(normalized) || /[a-z]ai\b/.test(normalized)) {
        score += points;
        if (!matchedTerms.includes(acronym)) {
          matchedTerms.push(acronym);
        }
      }
    } else {
      const regex = new RegExp(`\\b${acronym}\\b`);
      if (regex.test(normalized)) {
        score += points;
        if (!matchedTerms.includes(acronym)) {
          matchedTerms.push(acronym);
        }
      }
    }
  }

  // Check suffix scores (includes check for company names with composite words)
  for (const [suffix, points] of Object.entries(SUFFIX_SCORES)) {
    if (normalized.includes(suffix)) {
      score += points;
      if (!matchedTerms.includes(suffix)) {
        matchedTerms.push(suffix);
      }
    }
  }

  return {
    isTech: score >= 3,
    score,
    matchedTerms,
  };
}

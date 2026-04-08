import type { GestureCommand, FacialExpression } from "@/types";

// Stop words to remove for sign language grammar
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "am", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall", "should",
  "may", "might", "must", "can", "could", "to", "of", "in", "for", "on", "with",
  "at", "by", "from", "as", "into", "about", "but", "or", "and", "if", "then",
  "so", "its", "just", "very", "really", "also", "too",
]);

// Map verb conjugations to base form
const VERB_MAP: Record<string, string> = {
  going: "go", went: "go", gone: "go", goes: "go",
  eating: "eat", ate: "eat", eaten: "eat", eats: "eat",
  drinking: "drink", drank: "drink", drunk: "drink", drinks: "drink",
  sleeping: "sleep", slept: "sleep", sleeps: "sleep",
  working: "work", worked: "work", works: "work",
  helping: "help", helped: "help", helps: "help",
  wanting: "want", wanted: "want", wants: "want",
  knowing: "know", knew: "know", known: "know", knows: "know",
  thinking: "think", thought: "think", thinks: "think",
  seeing: "see", saw: "see", seen: "see", sees: "see",
  hearing: "hear", heard: "hear", hears: "hear",
  loving: "love", loved: "love", loves: "love",
  stopping: "stop", stopped: "stop", stops: "stop",
  saying: "say", said: "say", says: "say",
  coming: "come", came: "come", comes: "come",
  making: "make", made: "make", makes: "make",
  getting: "get", got: "get", gets: "get",
  giving: "give", gave: "give", given: "give", gives: "give",
  telling: "tell", told: "tell", tells: "tell",
  asking: "ask", asked: "ask", asks: "ask",
  using: "use", used: "use", uses: "use",
  finding: "find", found: "find", finds: "find",
  running: "run", ran: "run", runs: "run",
  playing: "play", played: "play", plays: "play",
  reading: "read", reads: "read",
  writing: "write", wrote: "write", written: "write", writes: "write",
  learning: "learn", learned: "learn", learns: "learn",
  teaching: "teach", taught: "teach", teaches: "teach",
  sitting: "sit", sat: "sit", sits: "sit",
  standing: "stand", stood: "stand", stands: "stand",
  walking: "walk", walked: "walk", walks: "walk",
  talking: "talk", talked: "talk", talks: "talk",
  calling: "call", called: "call", calls: "call",
  feeling: "feel", felt: "feel", feels: "feel",
  trying: "try", tried: "try", tries: "try",
  leaving: "leave", left: "leave", leaves: "leave",
  buying: "buy", bought: "buy", buys: "buy",
  paying: "pay", paid: "pay", pays: "pay",
  meeting: "meet", met: "meet", meets: "meet",
  living: "live", lived: "live", lives: "live",
  dying: "die", died: "die", dies: "die",
  waiting: "wait", waited: "wait", waits: "wait",
  starting: "start", started: "start", starts: "start",
  showing: "show", showed: "show", shown: "show", shows: "show",
  opening: "open", opened: "open", opens: "open",
  closing: "close", closed: "close", closes: "close",
  turning: "turn", turned: "turn", turns: "turn",
  moving: "move", moved: "move", moves: "move",
  following: "follow", followed: "follow", follows: "follow",
  creating: "create", created: "create", creates: "create",
  speaking: "speak", spoke: "speak", spoken: "speak", speaks: "speak",
  bringing: "bring", brought: "bring", brings: "bring",
  holding: "hold", held: "hold", holds: "hold",
  letting: "let", lets: "let",
  beginning: "begin", began: "begin", begun: "begin", begins: "begin",
  keeping: "keep", kept: "keep", keeps: "keep",
  putting: "put", puts: "put",
  meaning: "mean", meant: "mean", means: "mean",
  becoming: "become", became: "become", becomes: "become",
  taking: "take", took: "take", taken: "take", takes: "take",
};

// Expand contractions
const CONTRACTIONS: Record<string, string[]> = {
  "don't": ["not"],
  "doesn't": ["not"],
  "didn't": ["not"],
  "can't": ["not"],
  "won't": ["not"],
  "wouldn't": ["not"],
  "shouldn't": ["not"],
  "couldn't": ["not"],
  "isn't": ["not"],
  "aren't": ["not"],
  "wasn't": ["not"],
  "weren't": ["not"],
  "i'm": ["i"],
  "i've": ["i"],
  "i'll": ["i"],
  "i'd": ["i"],
  "you're": ["you"],
  "you've": ["you"],
  "you'll": ["you"],
  "he's": ["he"],
  "she's": ["she"],
  "it's": ["it"],
  "we're": ["we"],
  "we've": ["we"],
  "we'll": ["we"],
  "they're": ["they"],
  "they've": ["they"],
  "they'll": ["they"],
  "that's": ["that"],
  "there's": ["there"],
  "what's": ["what"],
  "who's": ["who"],
  "where's": ["where"],
  "let's": ["let"],
};

function detectSentiment(text: string): FacialExpression {
  const lower = text.toLowerCase();
  if (/[?]/.test(text) || /\b(what|where|who|how|when|why)\b/.test(lower))
    return "questioning";
  if (/\b(happy|love|great|wonderful|thank|good|yes|like|enjoy|welcome|please)\b/.test(lower))
    return "happy";
  if (/\b(sad|sorry|bad|terrible|cry|miss|hurt|pain)\b/.test(lower))
    return "sad";
  if (/[!]/.test(text) || /\b(wow|amazing|stop|help|no|never)\b/.test(lower))
    return "emphatic";
  return "neutral";
}

/**
 * Process raw text into sign language gesture commands.
 * Performs: contraction expansion, stop word removal, verb normalization, sentiment detection.
 */
export function processTextToGestures(text: string): {
  gestures: GestureCommand[];
  processedText: string;
} {
  if (!text.trim()) return { gestures: [], processedText: "" };

  const sentiment = detectSentiment(text);

  // Normalize and tokenize
  let words = text.toLowerCase().trim().split(/\s+/);

  // Expand contractions
  words = words.flatMap((w) => {
    // Normalize apostrophes
    const normalized = w.replace(/[\u2019']/g, "'");
    if (CONTRACTIONS[normalized]) return CONTRACTIONS[normalized];
    return [normalized];
  });

  // Clean punctuation
  words = words
    .map((w) => w.replace(/[^a-z'-]/g, ""))
    .filter((w) => w.length > 0);

  // Remove stop words and normalize verbs
  const tokens = words
    .filter((w) => !STOP_WORDS.has(w))
    .map((w) => VERB_MAP[w] || w);

  if (tokens.length === 0) return { gestures: [], processedText: "" };

  const processedText = tokens.join(" ").toUpperCase();

  // Generate gesture commands
  const gestures: GestureCommand[] = tokens.map((word, i) => ({
    word,
    animation: `${word}.glb`,
    duration: word.length === 1 ? 0.6 : 1.0,
    transition: 0.3,
    facial_expression: i === 0 ? sentiment : undefined,
  }));

  return { gestures, processedText };
}

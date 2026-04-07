"""NLP Processing service for converting English to sign-language-friendly structure.

Supports:
- ASL (American Sign Language) — Topic-Comment order, question words at end
- ISL (Indian Sign Language) — SOV order, topic fronting

Grammar transformations:
- Remove articles, auxiliaries, prepositions
- Simplify verb conjugations to base form
- Expand contractions
- Reorder based on target sign language grammar
- Detect negation, tense markers, and questions
- Emotion/sentiment detection for facial expression control
"""

import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Stop words to remove for sign language ───

STOP_WORDS = {
    # Articles
    "a", "an", "the",
    # Auxiliaries / copula
    "is", "am", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "shall", "can",
    # Prepositions (most are spatial in sign language, handled by classifier)
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "through", "during", "above", "below", "between",
    "out", "off", "over", "under",
    # Filler words
    "very", "just", "so", "than", "too", "also", "really", "quite",
    "much", "such", "even", "still", "already", "only",
}

# Words to KEEP even though they look like stop words (meaningful in sign language)
KEEP_WORDS = {
    "not", "no", "never", "before", "after", "again", "more",
    "but", "because", "if", "or", "and", "then", "now",
    "here", "there", "up", "down",
}

# ─── Verb simplification (conjugated → base form) ───

VERB_MAP = {
    # Movement
    "going": "go", "went": "go", "goes": "go", "gone": "go",
    "coming": "come", "came": "come", "comes": "come",
    "running": "run", "ran": "run", "runs": "run",
    "walking": "walk", "walked": "walk", "walks": "walk",
    "falling": "fall", "fell": "fall", "falls": "fall", "fallen": "fall",
    "leaving": "leave", "left": "leave", "leaves": "leave",
    "sitting": "sit", "sat": "sit", "sits": "sit",
    "standing": "stand", "stood": "stand", "stands": "stand",
    # Communication
    "talking": "talk", "talked": "talk", "talks": "talk",
    "saying": "say", "said": "say", "says": "say",
    "telling": "tell", "told": "tell", "tells": "tell",
    "asking": "ask", "asked": "ask", "asks": "ask",
    "calling": "call", "called": "call", "calls": "call",
    "reading": "read", "reads": "read",
    "writing": "write", "wrote": "write", "writes": "write", "written": "write",
    "signing": "sign", "signed": "sign", "signs": "sign",
    # Cognition
    "thinking": "think", "thought": "think", "thinks": "think",
    "knowing": "know", "knew": "know", "knows": "know", "known": "know",
    "learning": "learn", "learned": "learn", "learns": "learn",
    "teaching": "teach", "taught": "teach", "teaches": "teach",
    "understanding": "understand", "understood": "understand", "understands": "understand",
    "remembering": "remember", "remembered": "remember", "remembers": "remember",
    "forgetting": "forget", "forgot": "forget", "forgets": "forget", "forgotten": "forget",
    # Perception
    "seeing": "see", "saw": "see", "sees": "see", "seen": "see",
    "hearing": "hear", "heard": "hear", "hears": "hear",
    "looking": "look", "looked": "look", "looks": "look",
    "watching": "watch", "watched": "watch", "watches": "watch",
    "feeling": "feel", "felt": "feel", "feels": "feel",
    # Actions
    "eating": "eat", "ate": "eat", "eats": "eat", "eaten": "eat",
    "drinking": "drink", "drank": "drink", "drinks": "drink", "drunk": "drink",
    "sleeping": "sleep", "slept": "sleep", "sleeps": "sleep",
    "working": "work", "worked": "work", "works": "work",
    "playing": "play", "played": "play", "plays": "play",
    "making": "make", "made": "make", "makes": "make",
    "giving": "give", "gave": "give", "gives": "give", "given": "give",
    "taking": "take", "took": "take", "takes": "take", "taken": "take",
    "getting": "get", "got": "get", "gets": "get", "gotten": "get",
    "sending": "send", "sent": "send", "sends": "send",
    "bringing": "bring", "brought": "bring", "brings": "bring",
    "buying": "buy", "bought": "buy", "buys": "buy",
    "selling": "sell", "sold": "sell", "sells": "sell",
    "paying": "pay", "paid": "pay", "pays": "pay",
    "opening": "open", "opened": "open", "opens": "open",
    "closing": "close", "closed": "close", "closes": "close",
    "turning": "turn", "turned": "turn", "turns": "turn",
    "pulling": "pull", "pulled": "pull", "pulls": "pull",
    "pushing": "push", "pushed": "push", "pushes": "push",
    "holding": "hold", "held": "hold", "holds": "hold",
    "putting": "put", "puts": "put",
    "keeping": "keep", "kept": "keep", "keeps": "keep",
    "letting": "let", "lets": "let",
    "beginning": "begin", "began": "begin", "begins": "begin", "begun": "begin",
    "finishing": "finish", "finished": "finish", "finishes": "finish",
    "changing": "change", "changed": "change", "changes": "change",
    "moving": "move", "moved": "move", "moves": "move",
    "following": "follow", "followed": "follow", "follows": "follow",
    "showing": "show", "showed": "show", "shows": "show", "shown": "show",
    "building": "build", "built": "build", "builds": "build",
    "growing": "grow", "grew": "grow", "grows": "grow", "grown": "grow",
    "breaking": "break", "broke": "break", "breaks": "break", "broken": "break",
    "driving": "drive", "drove": "drive", "drives": "drive", "driven": "drive",
    "flying": "fly", "flew": "fly", "flies": "fly", "flown": "fly",
    "swimming": "swim", "swam": "swim", "swims": "swim",
    "cooking": "cook", "cooked": "cook", "cooks": "cook",
    "cleaning": "clean", "cleaned": "clean", "cleans": "clean",
    "washing": "wash", "washed": "wash", "washes": "wash",
    "wearing": "wear", "wore": "wear", "wears": "wear", "worn": "wear",
    "choosing": "choose", "chose": "choose", "chooses": "choose", "chosen": "choose",
    "dying": "die", "died": "die", "dies": "die",
    "fighting": "fight", "fought": "fight", "fights": "fight",
    "hurting": "hurt", "hurts": "hurt",
    "winning": "win", "won": "win", "wins": "win",
    "losing": "lose", "lost": "lose", "loses": "lose",
    "spending": "spend", "spent": "spend", "spends": "spend",
    "drawing": "draw", "drew": "draw", "draws": "draw", "drawn": "draw",
    "singing": "sing", "sang": "sing", "sings": "sing", "sung": "sing",
    "dancing": "dance", "danced": "dance", "dances": "dance",
    "praying": "pray", "prayed": "pray", "prays": "pray",
    "practicing": "practice", "practiced": "practice", "practices": "practice",
    # States / emotions
    "wanting": "want", "wanted": "want", "wants": "want",
    "needing": "need", "needed": "need", "needs": "need",
    "helping": "help", "helped": "help", "helps": "help",
    "starting": "start", "started": "start", "starts": "start",
    "stopping": "stop", "stopped": "stop", "stops": "stop",
    "living": "live", "lived": "live", "lives": "live",
    "loving": "love", "loved": "love", "loves": "love",
    "liking": "like", "liked": "like", "likes": "like",
    "hating": "hate", "hated": "hate", "hates": "hate",
    "trying": "try", "tried": "try", "tries": "try",
    "using": "use", "used": "use", "uses": "use",
    "finding": "find", "found": "find", "finds": "find",
    "meeting": "meet", "met": "meet", "meets": "meet",
    "waiting": "wait", "waited": "wait", "waits": "wait",
    "hoping": "hope", "hoped": "hope", "hopes": "hope",
    "wishing": "wish", "wished": "wish", "wishes": "wish",
    "believing": "believe", "believed": "believe", "believes": "believe",
    "caring": "care", "cared": "care", "cares": "care",
    "worrying": "worry", "worried": "worry", "worries": "worry",
}

# ─── Contractions ───

CONTRACTIONS = {
    "i'm": "i", "i've": "i", "i'll": "i", "i'd": "i",
    "you're": "you", "you've": "you", "you'll": "you", "you'd": "you",
    "he's": "he", "he'd": "he", "he'll": "he",
    "she's": "she", "she'd": "she", "she'll": "she",
    "it's": "it", "it'll": "it",
    "we're": "we", "we've": "we", "we'll": "we", "we'd": "we",
    "they're": "they", "they've": "they", "they'll": "they", "they'd": "they",
    "don't": "not", "doesn't": "not", "didn't": "not",
    "won't": "not", "wouldn't": "not", "couldn't": "not",
    "shouldn't": "not", "can't": "not", "cannot": "not",
    "isn't": "not", "aren't": "not", "wasn't": "not", "weren't": "not",
    "haven't": "not", "hasn't": "not", "hadn't": "not",
    "mustn't": "not", "needn't": "not",
    "that's": "that", "there's": "there",
    "what's": "what", "who's": "who", "where's": "where",
    "when's": "when", "why's": "why", "how's": "how",
    "let's": "let", "here's": "here",
}

# ─── Tense markers ───

PAST_MARKERS = {"yesterday", "ago", "last", "before", "already", "earlier", "previously"}
FUTURE_MARKERS = {"tomorrow", "later", "soon", "next", "tonight", "will"}

# ─── Sentiment / emotion keywords ───

POSITIVE_WORDS = {
    "happy", "love", "great", "good", "wonderful", "amazing", "excellent",
    "beautiful", "thank", "thanks", "please", "joy", "excited", "proud",
    "glad", "fun", "nice", "kind", "warm", "bright", "awesome", "cool",
    "perfect", "fantastic", "brilliant", "cheerful", "celebrate",
}
NEGATIVE_WORDS = {
    "sad", "angry", "bad", "terrible", "horrible", "hate", "sorry",
    "pain", "hurt", "sick", "tired", "worried", "scared", "afraid",
    "upset", "mad", "annoyed", "frustrated", "disappointed", "lonely",
    "boring", "awful", "ugly", "broken", "wrong", "fail", "failed",
    "cry", "crying", "depressed", "nervous", "anxious", "stress",
}
SURPRISE_WORDS = {"wow", "surprise", "surprised", "shocking", "shocked", "unbelievable", "incredible"}
QUESTION_WORDS = {"what", "where", "when", "who", "why", "how", "which"}

# ─── Number words ───
NUMBER_WORDS = {
    "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4",
    "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
    "ten": "10", "eleven": "11", "twelve": "12", "thirteen": "13",
    "fourteen": "14", "fifteen": "15", "sixteen": "16", "seventeen": "17",
    "eighteen": "18", "nineteen": "19", "twenty": "20", "thirty": "30",
    "forty": "40", "fifty": "50", "sixty": "60", "seventy": "70",
    "eighty": "80", "ninety": "90", "hundred": "100", "thousand": "1000",
}

# ─── Pronoun normalization ───
PRONOUN_MAP = {
    "me": "i", "my": "i", "mine": "i", "myself": "i",
    "your": "you", "yours": "you", "yourself": "you",
    "him": "he", "his": "he", "himself": "he",
    "her": "she", "hers": "she", "herself": "she",
    "us": "we", "our": "we", "ours": "we", "ourselves": "we",
    "them": "they", "their": "they", "theirs": "they", "themselves": "they",
    "its": "it", "itself": "it",
}


class NLPProcessor:
    """Processes English text into sign-language-friendly structure.

    ASL Grammar:
    - Topic-Comment structure (topic first, then comment)
    - Time → Topic → Comment order
    - Question words at the end
    - Negation after the verb
    - No articles, minimal prepositions

    ISL Grammar:
    - Subject-Object-Verb (SOV) order
    - Topic fronting (topic first)
    - Question words can be at beginning or end
    - Negation after the verb
    - Numbers before nouns
    """

    def process(self, text: str, sign_language: str = "ASL") -> dict:
        """Process text into sign language structure."""
        original = text.strip()
        if not original:
            return {
                "processed_text": "",
                "original_text": "",
                "tokens": [],
                "sentiment": "neutral",
            }

        # Step 1: Normalize
        normalized = original.lower()

        # Step 2: Expand contractions
        for contraction, expansion in CONTRACTIONS.items():
            normalized = re.sub(
                r"\b" + re.escape(contraction) + r"\b", expansion, normalized
            )

        # Step 3: Tokenize
        words = re.findall(r"[a-zA-Z']+|\?|!", normalized)

        # Step 4: Detect features
        sentiment = self._detect_sentiment(words)
        is_question = "?" in words or bool(set(words) & QUESTION_WORDS)
        is_negated = "not" in words or "no" in words or "never" in words
        tense = self._detect_tense(words)

        # Step 5: Simplify tokens
        tokens = self._simplify_tokens(words, sign_language)

        # Step 6: Apply sign language grammar reordering
        if sign_language == "ISL":
            tokens = self._apply_isl_grammar(tokens, is_question, tense)
        else:
            tokens = self._apply_asl_grammar(tokens, is_question, tense)

        processed_text = " ".join(tokens).upper()

        return {
            "processed_text": processed_text,
            "original_text": original,
            "tokens": tokens,
            "sentiment": sentiment,
        }

    def _simplify_tokens(self, words: list[str], sign_language: str) -> list[str]:
        """Convert word list to sign-language-friendly tokens."""
        tokens = []

        for word in words:
            # Skip punctuation
            if word in ("?", "!"):
                continue

            # Keep important connectors
            if word in KEEP_WORDS:
                tokens.append(word)
                continue

            # Skip stop words
            if word in STOP_WORDS:
                continue

            # Normalize pronouns
            if word in PRONOUN_MAP:
                word = PRONOUN_MAP[word]

            # Map verb conjugations to base form
            if word in VERB_MAP:
                word = VERB_MAP[word]

            # Convert number words
            if word in NUMBER_WORDS:
                word = NUMBER_WORDS[word]

            # Skip empty
            if not word.strip():
                continue

            # Avoid consecutive duplicates
            if tokens and tokens[-1] == word:
                continue

            tokens.append(word)

        return tokens if tokens else ["..."]

    def _apply_asl_grammar(
        self, tokens: list[str], is_question: bool, tense: Optional[str]
    ) -> list[str]:
        """Apply ASL grammar rules.

        ASL order: TIME → TOPIC → COMMENT
        Questions: question word at end
        Negation: after verb
        """
        time_tokens = []
        question_tokens = []
        negation_tokens = []
        content_tokens = []

        for t in tokens:
            if t in PAST_MARKERS or t in FUTURE_MARKERS or t in ("now", "today", "tomorrow", "yesterday"):
                time_tokens.append(t)
            elif t in QUESTION_WORDS:
                question_tokens.append(t)
            elif t in ("not", "never"):
                negation_tokens.append(t)
            else:
                content_tokens.append(t)

        # Reconstruct: TIME + CONTENT + NEGATION + QUESTION
        result = time_tokens + content_tokens + negation_tokens
        if is_question:
            result += question_tokens

        return result if result else ["..."]

    def _apply_isl_grammar(
        self, tokens: list[str], is_question: bool, tense: Optional[str]
    ) -> list[str]:
        """Apply ISL grammar rules.

        ISL order: TIME → SUBJECT → OBJECT → VERB (SOV)
        Topic fronting: location/time context first
        """
        time_tokens = []
        question_tokens = []
        negation_tokens = []
        content_tokens = []

        for t in tokens:
            if t in PAST_MARKERS or t in FUTURE_MARKERS or t in ("now", "today", "tomorrow", "yesterday"):
                time_tokens.append(t)
            elif t in QUESTION_WORDS:
                question_tokens.append(t)
            elif t in ("not", "never"):
                negation_tokens.append(t)
            else:
                content_tokens.append(t)

        # ISL: try to move verb to end (simple heuristic: known verbs)
        verbs = []
        non_verbs = []
        verb_set = set(VERB_MAP.values())
        for t in content_tokens:
            if t in verb_set:
                verbs.append(t)
            else:
                non_verbs.append(t)

        # Reconstruct: TIME + SUBJECT/OBJECT + NEGATION + VERB + QUESTION
        result = time_tokens + non_verbs + negation_tokens + verbs
        if is_question:
            result += question_tokens

        return result if result else ["..."]

    def _detect_tense(self, words: list[str]) -> Optional[str]:
        """Detect tense from time markers and auxiliaries."""
        word_set = set(words)
        if word_set & PAST_MARKERS or word_set & {"was", "were", "did", "had"}:
            return "past"
        if word_set & FUTURE_MARKERS or "will" in words:
            return "future"
        return "present"

    def _detect_sentiment(self, words: list[str]) -> str:
        """Keyword-based sentiment detection with weighted scoring."""
        word_set = set(words)

        has_question = "?" in words or bool(word_set & QUESTION_WORDS)
        has_surprise = bool(word_set & SURPRISE_WORDS)
        has_negative = bool(word_set & NEGATIVE_WORDS)
        has_positive = bool(word_set & POSITIVE_WORDS)
        has_negation = "not" in words or "no" in words or "never" in words

        # Negation can flip sentiment
        if has_negation and has_positive and not has_negative:
            return "negative"
        if has_negation and has_negative:
            # Double negation or negated negative → more neutral
            return "neutral"

        if has_question:
            return "questioning"
        if has_surprise:
            return "surprised"
        if has_negative:
            if "angry" in word_set or "mad" in word_set or "hate" in word_set:
                return "emphatic"
            return "sad" if "sad" in word_set or "cry" in word_set else "negative"
        if has_positive:
            return "happy" if word_set & {"happy", "joy", "excited", "glad"} else "positive"
        return "neutral"


# Singleton
nlp_processor = NLPProcessor()

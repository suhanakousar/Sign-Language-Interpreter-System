"""Text-to-Sign Engine: converts processed tokens to gesture sequences."""

import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Fingerspelling animation durations per letter
FINGERSPELL_DURATION = 0.4
FINGERSPELL_TRANSITION = 0.15

# Sentiment to facial expression mapping
SENTIMENT_EXPRESSION_MAP = {
    "neutral": "neutral",
    "positive": "happy",
    "happy": "happy",
    "negative": "sad",
    "sad": "sad",
    "questioning": "questioning",
    "emphatic": "emphatic",
}


class TextToSignService:
    def __init__(self):
        self.gesture_dict: dict = {}
        self._load_dictionary()

    def _load_dictionary(self):
        """Load the gesture dictionary from JSON."""
        dict_path = Path(__file__).parent / "gesture_dictionary.json"
        if dict_path.exists():
            with open(dict_path, "r") as f:
                data = json.load(f)
                # Index by word for fast lookup
                self.gesture_dict = {
                    entry["word"].lower(): entry for entry in data.get("gestures", [])
                }
            logger.info(f"Loaded {len(self.gesture_dict)} gesture entries")
        else:
            logger.warning("Gesture dictionary not found, using empty dictionary")

    def convert(
        self,
        tokens: list[str],
        sign_language: str = "ASL",
        sentiment: str = "neutral",
    ) -> dict:
        """Convert tokens to gesture sequence.

        Uses hybrid approach:
        1. Look up word in gesture dictionary
        2. Fall back to fingerspelling for unknown words

        Args:
            tokens: List of sign-language tokens (from NLP processor)
            sign_language: Target sign language
            sentiment: Detected sentiment for facial expressions

        Returns:
            dict with sequence, source_text, unknown_words
        """
        sequence = []
        unknown_words = []
        facial_expression = SENTIMENT_EXPRESSION_MAP.get(sentiment, "neutral")

        for token in tokens:
            token_lower = token.lower().strip()
            if not token_lower or token_lower == "...":
                continue

            if token_lower in self.gesture_dict:
                # Known gesture
                entry = self.gesture_dict[token_lower]
                sequence.append({
                    "word": token_lower,
                    "animation": entry.get("animation_file", f"{token_lower}.glb"),
                    "duration": entry.get("duration", 1.0),
                    "transition": entry.get("transition", 0.3),
                    "facial_expression": facial_expression,
                })
            else:
                # Fingerspell unknown word
                unknown_words.append(token_lower)
                for letter in token_lower:
                    if letter.isalpha():
                        sequence.append({
                            "word": letter.upper(),
                            "animation": f"fingerspell/{letter.lower()}.glb",
                            "duration": FINGERSPELL_DURATION,
                            "transition": FINGERSPELL_TRANSITION,
                            "facial_expression": facial_expression,
                        })

        source_text = " ".join(tokens).upper()

        return {
            "sequence": sequence,
            "source_text": source_text,
            "unknown_words": unknown_words,
        }


# Singleton
text_to_sign_service = TextToSignService()

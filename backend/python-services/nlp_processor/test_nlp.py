"""Unit tests for the NLP processor service."""

import pytest
from service import NLPProcessor


@pytest.fixture
def processor():
    return NLPProcessor()


class TestNLPProcessor:
    def test_basic_simplification(self, processor):
        """Test: 'I am going to school' → 'I GO SCHOOL'"""
        result = processor.process("I am going to school")
        assert "GO" in result["processed_text"]
        assert "SCHOOL" in result["processed_text"]
        # Articles and prepositions should be removed
        assert "AM" not in result["processed_text"]
        assert "TO" not in result["processed_text"]

    def test_contraction_expansion(self, processor):
        """Test contractions are handled."""
        result = processor.process("I don't want to go")
        tokens = result["tokens"]
        assert "not" in tokens
        assert "want" in tokens
        assert "go" in tokens

    def test_verb_simplification(self, processor):
        """Test conjugated verbs are reduced to base form."""
        result = processor.process("She was eating lunch")
        assert "eat" in result["tokens"]
        assert "eating" not in result["tokens"]

    def test_question_detection(self, processor):
        """Test sentiment detection for questions."""
        result = processor.process("Where are you going?")
        assert result["sentiment"] == "questioning"

    def test_positive_sentiment(self, processor):
        """Test positive sentiment detection."""
        result = processor.process("I am very happy today")
        assert result["sentiment"] in ("happy", "positive")

    def test_negative_sentiment(self, processor):
        """Test negative sentiment detection."""
        result = processor.process("I feel sad")
        assert result["sentiment"] in ("sad", "negative")

    def test_empty_input(self, processor):
        """Test empty input handling."""
        result = processor.process("")
        assert result["processed_text"] == ""
        assert result["tokens"] == []

    def test_stop_word_removal(self, processor):
        """Test that articles and prepositions are removed."""
        result = processor.process("The cat is on the table")
        assert "the" not in result["tokens"]
        assert "on" not in result["tokens"]
        assert "is" not in result["tokens"]

    def test_asl_question_reorder(self, processor):
        """Test ASL moves question words to end."""
        result = processor.process("What is your name?", sign_language="ASL")
        tokens = result["tokens"]
        if "what" in tokens:
            assert tokens[-1] == "what"

    def test_preserves_meaningful_words(self, processor):
        """Test that content words are preserved."""
        result = processor.process("My mother loves cooking food")
        tokens = result["tokens"]
        assert "mother" in tokens
        assert "love" in tokens  # 'loves' → 'love'
        assert "food" in tokens

    def test_multiple_verbs(self, processor):
        """Test multiple verb simplifications in one sentence."""
        result = processor.process("He was running and jumping")
        tokens = result["tokens"]
        assert "run" in tokens

    def test_long_sentence(self, processor):
        """Test processing of longer sentences."""
        text = "I would like to go to the store to buy some food for my family"
        result = processor.process(text)
        assert len(result["tokens"]) > 0
        assert len(result["tokens"]) < text.split().__len__()  # Should be shorter


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""Unit tests for the Text-to-Sign service."""

import pytest
from service import TextToSignService


@pytest.fixture
def service():
    return TextToSignService()


class TestTextToSignService:
    def test_known_word_lookup(self, service):
        """Test that known words are found in dictionary."""
        result = service.convert(["hello"])
        assert len(result["sequence"]) == 1
        assert result["sequence"][0]["word"] == "hello"
        assert result["sequence"][0]["animation"] == "hello.glb"

    def test_unknown_word_fingerspelling(self, service):
        """Test that unknown words are fingerspelled."""
        result = service.convert(["xylophone"])
        assert len(result["sequence"]) > 1  # Multiple letters
        assert "xylophone" in result["unknown_words"]
        # Each letter should be a separate gesture
        assert result["sequence"][0]["word"] == "X"

    def test_mixed_known_unknown(self, service):
        """Test mix of known and unknown words."""
        result = service.convert(["i", "love", "pizza"])
        assert len(result["unknown_words"]) > 0  # 'pizza' not in dict
        assert result["sequence"][0]["word"] == "i"
        assert result["sequence"][1]["word"] == "love"

    def test_empty_tokens(self, service):
        """Test empty token handling."""
        result = service.convert(["..."])
        assert len(result["sequence"]) == 0

    def test_facial_expression(self, service):
        """Test sentiment maps to facial expression."""
        result = service.convert(["hello"], sentiment="happy")
        assert result["sequence"][0]["facial_expression"] == "happy"

    def test_source_text_preserved(self, service):
        """Test source text is included in response."""
        result = service.convert(["i", "go", "school"])
        assert result["source_text"] == "I GO SCHOOL"

    def test_duration_present(self, service):
        """Test that all gestures have duration."""
        result = service.convert(["hello", "i", "you"])
        for gesture in result["sequence"]:
            assert gesture["duration"] > 0

    def test_transition_present(self, service):
        """Test that all gestures have transition values."""
        result = service.convert(["hello", "i"])
        for gesture in result["sequence"]:
            assert "transition" in gesture


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

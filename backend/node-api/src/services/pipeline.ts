import axios from "axios";
import { config } from "../config";
import { logger } from "../config/logger";

interface TranscriptionResult {
  text: string;
  is_final: boolean;
  confidence: number;
  language: string;
}

interface NLPResult {
  processed_text: string;
  original_text: string;
  tokens: string[];
  sentiment: string;
}

interface GestureCommand {
  word: string;
  animation: string;
  duration: number;
  transition: number;
  facial_expression: string;
}

interface GestureResult {
  sequence: GestureCommand[];
  source_text: string;
  unknown_words: string[];
}

export class PipelineService {
  // Step 1: Speech to Text
  async transcribeAudio(
    audioBuffer: Buffer,
    language: string = "en"
  ): Promise<TranscriptionResult> {
    try {
      const formData = new FormData();
      formData.append(
        "audio",
        new Blob([audioBuffer], { type: "audio/webm" }),
        "audio.webm"
      );
      formData.append("language", language);

      const response = await axios.post(
        `${config.speechToTextUrl}/transcribe`,
        formData,
        {
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      logger.error("Speech-to-text service error:", error);
      throw new Error("Transcription failed");
    }
  }

  // Step 2: NLP Processing
  async processText(
    text: string,
    signLanguage: string = "ASL"
  ): Promise<NLPResult> {
    try {
      const response = await axios.post(
        `${config.nlpProcessorUrl}/process`,
        { text, sign_language: signLanguage },
        { timeout: 5000 }
      );

      return response.data;
    } catch (error) {
      logger.error("NLP processor error:", error);
      throw new Error("NLP processing failed");
    }
  }

  // Step 3: Text to Sign Gestures
  async textToGestures(
    processedTokens: string[],
    signLanguage: string = "ASL"
  ): Promise<GestureResult> {
    try {
      const response = await axios.post(
        `${config.textToSignUrl}/convert`,
        { tokens: processedTokens, sign_language: signLanguage },
        { timeout: 5000 }
      );

      return response.data;
    } catch (error) {
      logger.error("Text-to-sign service error:", error);
      throw new Error("Gesture conversion failed");
    }
  }

  // Full pipeline: Audio → Text → NLP → Gestures
  async processAudioChunk(
    audioBuffer: Buffer,
    language: string = "en",
    signLanguage: string = "ASL"
  ): Promise<{
    transcript: TranscriptionResult;
    nlp: NLPResult;
    gestures: GestureResult;
  }> {
    // Step 1: Transcribe
    const transcript = await this.transcribeAudio(audioBuffer, language);

    if (!transcript.text.trim()) {
      return {
        transcript,
        nlp: {
          processed_text: "",
          original_text: "",
          tokens: [],
          sentiment: "neutral",
        },
        gestures: { sequence: [], source_text: "", unknown_words: [] },
      };
    }

    // Step 2: NLP
    const nlp = await this.processText(transcript.text, signLanguage);

    // Step 3: Gestures
    const gestures = await this.textToGestures(nlp.tokens, signLanguage);

    return { transcript, nlp, gestures };
  }
}

export const pipelineService = new PipelineService();

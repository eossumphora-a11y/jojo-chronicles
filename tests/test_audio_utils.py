"""Audio utilities smoke tests (without requiring Whisper or uploaded audio)."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from local_server import timestamp, speaker_label, HOST, AUDIO_EXTENSIONS


class LocalTranscriptionTest(unittest.TestCase):
    def test_timestamps(self):
        self.assertEqual(timestamp(0), "00:00")
        self.assertEqual(timestamp(61.99), "01:01")
        self.assertEqual(timestamp(3661), "01:01:01")

    def test_craig_track_names(self):
        self.assertEqual(speaker_label("Giulia.flac"), "Giulia")
        self.assertEqual(speaker_label("voce 2.mp3"), "voce 2")
        self.assertEqual(speaker_label("../../traccia.wav"), "traccia")
        self.assertNotIn("/", speaker_label("foo/evil.wav"))

    def test_local_binding_and_formats(self):
        self.assertEqual(HOST, "127.0.0.1")
        self.assertIn(".flac", AUDIO_EXTENSIONS)
        self.assertIn(".opus", AUDIO_EXTENSIONS)


if __name__ == "__main__":
    unittest.main()

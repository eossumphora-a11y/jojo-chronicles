"""Tests for persistent Craig source labels; no audio required."""
import unittest

from speaker_aliases import speaker_cast, resolve_speaker, annotate_transcript_speakers


class SpeakerMapTests(unittest.TestCase):
    def test_confirmed_player_cast(self):
        cast={x["player"]:x["character"] for x in speaker_cast()["confirmedPlayerCast"]}
        self.assertEqual(cast["Francesco"],"Jean")
        self.assertEqual(cast["Maria Luisa"],"Elisabeth")
        self.assertEqual(cast["Alessandro"],"Julian")
        self.assertEqual(cast["Tito"],"David / Davì")
        self.assertEqual(cast["Filippo"],"Joshwa")

    def test_qualifications_preserved(self):
        self.assertEqual(resolve_speaker("hpLtz6wiWS85-1-maracuja3914.srt")["confidence"],"confirmed_by_user")
        self.assertEqual(resolve_speaker("6-maxti077")["confidence"],"confirmed_by_user")
        self.assertEqual(resolve_speaker("3-.eruname_nuova")["role"],"master")
        self.assertEqual(resolve_speaker("2-marialuisa9042_originale")["characterId"],"pg-elisabeth")
        self.assertIsNone(resolve_speaker("unrecognized_person"))

    def test_annotations_keep_original_source(self):
        text="[00:32:28] [2-marialuisa9042_originale] Cosa ci guadagni?\\n[03:00:01] [3-.eruname_nuova] Il narratore dice qualcosa."
        a=annotate_transcript_speakers(text)
        self.assertIn("2-marialuisa9042_originale",a)
        self.assertIn("giocatore di Elisabeth",a)
        self.assertIn("potrebbe parlare fuori personaggio",a)
        self.assertIn("Master/narratore",a)
        self.assertIn("Cosa ci guadagni?",a)
        self.assertEqual(annotate_transcript_speakers(a),a)


if __name__=="__main__":
    unittest.main()

"""Checks: a new wiki record must originate from literal recap evidence."""
import unittest
from recap_engine import parse_candidates, contains_mention, safe_quotes, split_transcript

class RecapTests(unittest.TestCase):
    def test_only_names_in_recap(self):
        text="Sue Nami vede Justin Time; trova la Chiave d'Avorio."
        raw={"entities":[
            {"kind":"character","name":"Sue Nami","evidence":"Sue Nami vede Justin Time; trova la Chiave d'Avorio."},
            {"kind":"stand","name":"Justin Time","evidence":"Sue Nami vede Justin Time; trova la Chiave d'Avorio."},
            {"kind":"artifact","name":"Chiave d'Avorio","evidence":"Sue Nami vede Justin Time; trova la Chiave d'Avorio."},
            {"kind":"character","name":"Mai detto","evidence":"Non compare"},
            {"kind":"stand","name":"Justin Time","evidence":"Sue Nami vede Justin Time; trova la Chiave d'Avorio."}
        ]}
        result=parse_candidates(raw,text)
        self.assertEqual([(x["kind"],x["title"]) for x in result],
                         [("character","Sue Nami"),("stand","Justin Time"),("artifact","Chiave d'Avorio")])
        self.assertTrue(all(x["public"] is False for x in result))
    def test_safe_quotes(self):
        self.assertEqual(safe_quotes([{"text":"Frase inventata"}],"Nessuno dice questo"), [])
    def test_boundary(self):
        self.assertFalse(contains_mention("Rusty Hooker", "Rusty Hook"))
    def test_chunks(self):
        data="\n".join("01:23 | parla" for _ in range(100))
        self.assertEqual("".join(split_transcript(data,limit=110)), data)
if __name__=="__main__":
    unittest.main()

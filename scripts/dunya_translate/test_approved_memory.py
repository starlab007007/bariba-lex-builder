#!/usr/bin/env python3
"""Regression tests: unreviewed gold items must never enter phone memory."""
import csv
import tempfile
import unittest
from pathlib import Path
from build_approved_memory import build, normalize

FIELDS = ["ID","Direction","Source","Reference","Traduction_HF","Traduction_Space",
          "Score","Reference_verifiee","Traduction_corrigee","Statut_validation","Commentaire"]

class OfflineMemoryTests(unittest.TestCase):
    def run_builder(self, rows):
        with tempfile.TemporaryDirectory() as td:
            csv_path = Path(td) / "review.csv"
            with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=FIELDS, delimiter=";")
                writer.writeheader()
                writer.writerows(rows)
            return build(csv_path, Path(td) / "memory.json")

    def test_normalization_preserves_tones(self):
        self.assertEqual(normalize("  Na    tɛ̃ɛra. "), "Na tɛ̃ɛra.")

    def test_unapproved_rows_are_excluded(self):
        rows = [{"Direction":"fr-ba","Source":"Bonjour", "Reference_verifiee":"Salut",
                 "Traduction_corrigee":"Test", "Statut_validation":"A_VALIDER"}]
        self.assertEqual(self.run_builder(rows)["entries"], [])

    def test_only_complete_approved_pair_is_exported(self):
        rows = [{"Direction":"fr-ba","Source":"  Bonjour  ", "Reference_verifiee":" Test ",
                 "Traduction_corrigee":"Kpɛ", "Statut_validation":"VALIDE"}]
        result = self.run_builder(rows)
        self.assertEqual(result["entries"], [{"direction":"fr-ba","source":"Bonjour","target":"Kpɛ"}])

    def test_approved_without_verified_reference_rejected(self):
        rows = [{"Direction":"ba-fr","Source":"Kpɛ", "Reference_verifiee":"",
                 "Traduction_corrigee":"Bonjour", "Statut_validation":"VALIDE"}]
        self.assertEqual(self.run_builder(rows)["entries"], [])

    def test_conflicting_translations_never_resurface(self):
        base = {"Direction": "fr-ba", "Source": "Bonjour", "Reference_verifiee": "Test",
                "Statut_validation": "VALIDE"}
        rows = [dict(base, Traduction_corrigee=t) for t in ("A", "B", "B")]
        result = self.run_builder(rows)
        self.assertEqual(result["entries"], [])
        self.assertEqual(result["rejected"]["conflict"], 2)

if __name__ == "__main__":
    unittest.main()

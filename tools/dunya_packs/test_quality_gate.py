"""Synthetic fixtures ONLY, proving release gate logic without certifying MMS."""
import csv
import pathlib
import tempfile
import unittest

from quality_gate import evaluate


class HumanQualityGateTests(unittest.TestCase):
    fields = ["text_id", "speaker_id", "village", "correctly_understood",
              "tone_score", "naturalness_score"]

    def rows(self, negative=False):
        return [
            {
                "text_id": f"phrase-{i:02d}",
                "speaker_id": f"speaker-{j}",
                "village": f"village-{j % 3}",
                "correctly_understood": "0" if negative else "1",
                "tone_score": "1" if negative else "5",
                "naturalness_score": "1" if negative else "5",
            }
            for i in range(30) for j in range(5)
        ]

    def score(self, rows):
        with tempfile.TemporaryDirectory() as directory:
            source = pathlib.Path(directory) / "synthetic-testing-only.csv"
            with source.open("w", encoding="utf-8", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=self.fields)
                writer.writeheader()
                writer.writerows(rows)
            return evaluate(source)

    def test_accepts_complete_high_quality_fixture_without_certifying_model(self):
        report = self.score(self.rows())
        self.assertTrue(report["passed"])
        self.assertEqual(report["judgments"], 150)
        self.assertEqual(report["villages"], 3)

    def test_rejects_unintelligible_voice(self):
        self.assertFalse(self.score(self.rows(negative=True))["passed"])

    def test_requires_multiple_independent_human_judgments(self):
        with self.assertRaisesRegex(ValueError, "5 locuteurs"):
            self.score([row for row in self.rows() if row["speaker_id"] != "speaker-4"])

    def test_refuses_duplicate_text_speaker(self):
        rows = self.rows()
        rows.append(rows[0].copy())
        with self.assertRaisesRegex(ValueError, "dupliquees"):
            self.score(rows)


if __name__ == "__main__":
    unittest.main()

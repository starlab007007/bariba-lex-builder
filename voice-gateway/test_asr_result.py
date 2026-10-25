"""Regression coverage for the actual list[str] Omnilingual response contract."""
import ast
from pathlib import Path
from types import SimpleNamespace
import unittest

from asr_result import transcript_text


class ASRContractTests(unittest.TestCase):
    def test_official_pipeline_string_is_preserved(self):
        self.assertEqual(transcript_text("  Baa wunɛ  "), "Baa wunɛ")

    def test_legacy_adapters_are_supported(self):
        for result in [{"text": "Bonjour"}, SimpleNamespace(text="Bonjour")]:
            self.assertEqual(transcript_text(result), "Bonjour")

    def test_invalid_or_empty_results_never_become_transcripts(self):
        for result in [None, "  ", {}, {"text": 42}, ["Bonjour"]]:
            self.assertEqual(transcript_text(result), "")

    def test_gateway_consumes_real_pipeline_shape(self):
        tree = ast.parse(Path(__file__).with_name("app.py").read_text())
        node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "_run_asr")
        pipeline = SimpleNamespace(transcribe=lambda files, batch_size: ["Baa wunɛ"])
        namespace = {"Path": Path, "_state": {"asr_loaded": True},
                     "_asr_pipeline": pipeline, "transcript_text": transcript_text}
        exec(compile(ast.Module(body=[node], type_ignores=[]), "app.py", "exec"), namespace)
        self.assertEqual(namespace["_run_asr"](Path("sample.wav")), "Baa wunɛ")

    def test_startup_calls_follow_inference_definitions(self):
        tree = ast.parse(Path(__file__).with_name("app.py").read_text())
        positions = {n.name: i for i, n in enumerate(tree.body) if isinstance(n, ast.FunctionDef)}
        warmup = next(i for i, n in enumerate(tree.body) if isinstance(n, ast.Expr)
                      and isinstance(n.value, ast.Call) and isinstance(n.value.func, ast.Name)
                      and n.value.func.id == "_warm_up")
        self.assertGreater(warmup, max(positions["_run_asr"], positions["_run_tts"]))


if __name__ == "__main__":
    unittest.main()

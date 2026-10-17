"""Deterministic tests for voice pack splitting, without model downloads."""
import hashlib
import json
import pathlib
import tempfile
import unittest
import zipfile

from split_voice_core import prepare, MMS_ID, ASR_ID


class SplitVoicePacksTest(unittest.TestCase):
    def build_fixture(self, source, corrupt=False):
        parts = {
            "asr/model.int8.onnx": b"mock-asr-onnx",
            "asr/tokens.txt": b"mock-asr-tokens",
            "tts-bba/model.onnx": b"mock-vits-onnx",
            "tts-bba/tokens.txt": b"mock-bba-tokens",
            "tts-bba/normalize.json": b'{"ɔ":"o"}',
        }
        manifest = {"id": "dunya-voice-core", "format": "dunya-pack/1",
                    "files": [{"path": path, "size": len(content),
                               "sha256": hashlib.sha256(content + (b"tampered" if corrupt else b"")).hexdigest()}
                              for path, content in parts.items()]}
        with zipfile.ZipFile(source, "w", compression=zipfile.ZIP_STORED) as z:
            for name, content in parts.items():
                z.writestr(name, content)
            z.writestr("manifest.json", json.dumps(manifest))

    def test_split_preserves_weights_and_attribution(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d)
            self.build_fixture(path / "input.zip")
            results = prepare(path / "input.zip", path / "out")
            self.assertEqual(set(results), {MMS_ID, ASR_ID})
            with zipfile.ZipFile(path / "out" / f"{MMS_ID}-v1.zip") as z:
                self.assertIn("ATTRIBUTION-MMS.txt", z.namelist())
                self.assertEqual(z.read("tts-bba/model.onnx"), b"mock-vits-onnx")
                self.assertNotIn("asr/model.int8.onnx", z.namelist())
            with zipfile.ZipFile(path / "out" / f"{ASR_ID}-v1.zip") as z:
                self.assertIn("asr/model.int8.onnx", z.namelist())
                self.assertNotIn("tts-bba/model.onnx", z.namelist())
            sidecar = json.loads((path / "out" / f"{MMS_ID}-v1.manifest.json").read_text())
            self.assertFalse(sidecar["quality_certified"])
            self.assertEqual(sidecar["license"], "CC-BY-NC-4.0")

    def test_rejects_corrupted_source(self):
        with tempfile.TemporaryDirectory() as d:
            path = pathlib.Path(d)
            self.build_fixture(path / "input.zip", corrupt=True)
            with self.assertRaisesRegex(ValueError, "Hash de la source incorrect"):
                prepare(path / "input.zip", path / "out")


if __name__ == "__main__":
    unittest.main()

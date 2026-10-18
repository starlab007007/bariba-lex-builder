import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location(
    "certify_mobile_pack", pathlib.Path(__file__).with_name("certify_mobile_pack.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def fixture():
    parity = {
        "parity_only_not_quality_certification": True,
        "by_direction": {direction: {"total": 40, "matched": 40}
                         for direction in ("fr-ba", "ba-fr")},
    }
    quality = {"report": {"by_direction": {
        direction: {"n": 120, "sacrebleu_chrf++": 50.0, "loop": 0.0}
        for direction in ("fr-ba", "ba-fr")
    }}}
    android = {
        "physical_device": True, "airplane_mode": True,
        "runtime": "onnxruntime-mobile", "model_sha256": "a" * 64,
        "ram_peak_mb": 1000, "p95_latency_ms": 5000,
        "by_direction": {direction: {"passed": 30, "failed": 0}
                         for direction in ("fr-ba", "ba-fr")},
    }
    return parity, quality, android


class CertificationGateTests(unittest.TestCase):
    def test_valid_evidence(self):
        module.validate(*fixture())

    def test_missing_offline_evidence_is_rejected(self):
        p, q, a = fixture()
        a["airplane_mode"] = False
        with self.assertRaises(ValueError):
            module.validate(p, q, a)

    def test_regression_in_either_direction_is_rejected(self):
        p, q, a = fixture()
        p["by_direction"]["ba-fr"]["matched"] = 39
        with self.assertRaises(ValueError):
            module.validate(p, q, a)

    def test_low_quality_is_rejected(self):
        p, q, a = fixture()
        q["report"]["by_direction"]["fr-ba"]["sacrebleu_chrf++"] = 29.92
        with self.assertRaises(ValueError):
            module.validate(p, q, a)

    def test_no_phone_measurements_is_rejected(self):
        p, q, a = fixture()
        a["by_direction"]["fr-ba"]["passed"] = 0
        with self.assertRaises(ValueError):
            module.validate(p, q, a)


if __name__ == "__main__":
    unittest.main()

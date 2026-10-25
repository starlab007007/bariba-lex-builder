import http.client
import json
import os
import threading
import unittest
from unittest.mock import patch

import app


class MessageContractTests(unittest.TestCase):
    def test_real_sdk_serializes_assistant_history(self):
        # Exercise the installed SDK's Message.model contract: the former
        # HTTP mocks never detected a str being used where Contents is required.
        from contextlib import contextmanager
        import litert_lm
        captured = []

        class Conversation:
            def send_message(self, text):
                return {'content': [{'type': 'text', 'text': 'La rotation protège le sol.'}]}

        class Engine:
            @contextmanager
            def create_conversation(self, **kwargs):
                captured.extend(message.to_json() for message in kwargs['messages'])
                yield Conversation()

        with patch.object(app, 'engine', Engine()):
            result = app.generate({'message': 'Explique plus simplement.', 'history': [
                {'role': 'user', 'content': 'Pourquoi varier les cultures ?'},
                {'role': 'assistant', 'content': 'Pour garder un sol fertile.'},
            ], 'voice': True})
        self.assertEqual(result['model'], 'gemma-4-e2b')
        self.assertTrue(result['response_fr'])
        self.assertEqual(captured[-1]['role'], 'assistant')
        self.assertIn('Pour garder un sol fertile.', str(captured[-1]))


class HTTPContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = app.ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def request(self, body, token='test-secret', raw=False):
        client = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        data = body if raw else json.dumps(body)
        client.request('POST', '/chat', data, {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        response = client.getresponse(); result = (response.status, json.loads(response.read())); client.close()
        return result

    def setUp(self):
        self.env = patch.dict(os.environ, {'FITILA_MODEL_API_TOKEN': 'test-secret'}); self.env.start()
        self.engine = patch.object(app, 'engine', object()); self.engine.start()

    def tearDown(self):
        self.engine.stop(); self.env.stop()

    def test_authentication_precedes_inference(self):
        with patch.object(app, 'generate') as generate:
            self.assertEqual(self.request({'message': 'hello'}, token='wrong')[0], 401)
            generate.assert_not_called()

    def test_real_http_contract_preserves_model_and_answer(self):
        with patch.object(app, 'generate', return_value={'response_fr': 'Bonjour.', 'model': 'gemma-4-e2b', 'provider': 'fitila-local'}):
            code, result = self.request({'message': 'Bonjour'})
        self.assertEqual(code, 200); self.assertEqual(result['model'], 'gemma-4-e2b')
        self.assertEqual(result['response_fr'], 'Bonjour.'); self.assertIn('duration', result)

    def test_invalid_json_and_large_bodies_never_run_the_model(self):
        with patch.object(app, 'generate') as generate:
            self.assertEqual(self.request('{', raw=True)[0], 400)
            self.assertEqual(self.request({'message': 'x' * 25000})[0], 413)
            self.assertEqual(self.request([])[0], 400)
            generate.assert_not_called()

    def test_only_one_cpu_inference_can_run(self):
        with patch.object(app, 'generate') as generate:
            app.inference_lock.acquire()
            try: self.assertEqual(self.request({'message': 'hello'})[0], 429)
            finally: app.inference_lock.release()
            generate.assert_not_called()

    def test_model_failure_releases_the_cpu_slot_and_hides_details(self):
        with patch.object(app, 'generate', side_effect=RuntimeError('private engine detail')):
            code, result = self.request({'message': 'hello'})
        self.assertEqual(code, 503); self.assertNotIn('private', json.dumps(result))
        self.assertFalse(app.inference_lock.locked())

    def test_missing_engine_is_not_reported_as_healthy_inference(self):
        with patch.object(app, 'engine', None):
            self.assertEqual(self.request({'message': 'hello'})[0], 503)


if __name__ == '__main__': unittest.main()

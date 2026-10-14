import unittest
from compare import score, edit_distance

class Metrics(unittest.TestCase):
    def test_exact(self):
        a=score("Bààtɔ̀nú","Bààtɔ̀nú")
        self.assertEqual(a["word_errors"],0)
        self.assertEqual(a["char_errors"],0)
    def test_word_error(self):
        a=score("bonjour monde","bonjour ami")
        self.assertEqual(a["word_errors"],1)
        self.assertEqual(a["words"],2)
    def test_insertion(self):
        self.assertEqual(edit_distance(["a"],["a","b"]),1)

if __name__=="__main__":unittest.main()

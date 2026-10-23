import importlib.util, unittest
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'skills/smarteda-agent'
spec=importlib.util.spec_from_file_location('circuit',p/'scripts/circuit.py'); c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class CircuitTests(unittest.TestCase):
    def test_sample(self):
        _,stats=c.inspect_xml((p/'assets/pt100.circuit').read_text(encoding='utf8'))
        self.assertEqual(stats,{'components':14,'connectors':13})
    def test_compact_normalization(self):
        text='<circuit><item itemtype="Ground" CircId="G-1"/></circuit>'
        self.assertIn('>\n<',c.normalize(text))
        self.assertEqual(c.inspect_xml(text)[1],c.inspect_xml(c.normalize(text))[1])
    def test_duplicate(self):
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            c.inspect_xml('<circuit><item CircId="a"/><item CircId="a"/></circuit>')
    def test_dangling(self):
        with self.assertRaisesRegex(ValueError,'Dangling'):
            c.inspect_xml('<circuit><item itemtype="Connector" uid="c" startpinid="unknown-pin"/></circuit>')

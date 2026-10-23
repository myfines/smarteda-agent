"""Normalize and validate SmartEDA native XML, without contacting cloud services."""
import argparse
import re
from pathlib import Path
import xml.etree.ElementTree as ET

def inspect_xml(text):
    def repair(tag):
        raw=tag.group(0)
        if 'itemtype="Oscope"' not in raw: return raw
        seen={}
        def replace(match):
            key,value=match.group(1),match.group(2)
            if key in seen:
                if seen[key]!=value: raise ValueError('Conflicting native Oscope attribute '+key)
                return ''
            seen[key]=value
            return match.group(0)
        return re.sub(r'\s([\w:-]+)="([^"]*)"',replace,raw)
    text=re.sub(r'<item\b[^>]*>',repair,text)
    root=ET.fromstring(text)
    if root.tag != 'circuit': raise ValueError('Expected circuit root')
    items=list(root.findall('item'))
    ids=[x.get('CircId') or x.get('uid') for x in items]
    if any(not x for x in ids): raise ValueError('Missing item ID')
    if len(ids)!=len(set(ids)): raise ValueError('Duplicate item ID')
    components={i for i,x in zip(ids,items) if x.get('itemtype')!='Connector'}
    wires=[x for x in items if x.get('itemtype')=='Connector']
    for w in wires:
        for key in ('startpinid','endpinid'):
            pin=w.get(key,'')
            if not any(pin.startswith(i+'-') for i in components):
                raise ValueError('Dangling component reference: '+pin)
        points=w.get('pointList','').split(',')
        if len(points)<4 or len(points)%2: raise ValueError('Invalid wire pointList')
        for p in points: float(p)
    return root, {'components':len(components),'connectors':len(wires)}

def normalize(text):
    root,_=inspect_xml(text)
    ET.indent(root, space='')
    return ET.tostring(root,encoding='unicode')+'\n'

def main():
    import json
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['check','normalize']);p.add_argument('input',type=Path)
    p.add_argument('output',nargs='?',type=Path);p.add_argument('--wires',type=int)
    a=p.parse_args(); text=a.input.read_text(encoding='utf-8-sig'); _,stats=inspect_xml(text)
    if a.wires is not None and stats['connectors']!=a.wires: raise ValueError('Unexpected connector count')
    if a.action=='normalize':
        if a.output is None: p.error('normalize requires output path')
        if a.input.resolve()==a.output.resolve(): p.error('Use separate output to preserve original')
        a.output.write_text(normalize(text),encoding='utf-8')
    print(json.dumps(stats))
if __name__=='__main__': main()

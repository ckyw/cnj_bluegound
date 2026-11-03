"""Copy original design imagery locally; reproducible, no runtime image dependency."""
from pathlib import Path
from html.parser import HTMLParser
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'stitch_boutique_hotel_booking_redesign'
TARGET = ROOT / 'src/assets/images'
class Images(HTMLParser):
    def __init__(self): super().__init__(); self.urls = []
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == 'img': self.urls.append(d['src'])

manifest = {}
def download(name, url):
    path = TARGET / (name + '.jpg')
    if not path.exists():
        subprocess.run(['curl', '--fail', '--location', '--silent', '--show-error', '--max-time', '40', url, '--output', str(path)], check=True)
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', '1920', str(path), '--out', str(path)], check=True, capture_output=True)
    manifest[name] = url
    print(name, path.stat().st_size)

for source, names in [
    ('the_pipe_hotel_branch_locations', ['skip', 'myeongdong', 'dongdaemun', 'yeonnam', 'yongsan', 'tea', 'vinyl', 'market']),
    ('the_pipe_hotel_room_detail', ['skip', 'standard', 'bathroom', 'workspace', 'amenities', 'twin', 'superior', 'studio'])
]:
    parser = Images(); parser.feed((SOURCE / source / 'code.html').read_text())
    for name, url in zip(names, parser.urls):
        if name != 'skip': download(name, url)
home = (SOURCE / 'the_pipe_hotel_home_booking/code.html').read_text()
match = re.search(r'background-image:\s*url\([\'\"]([^\'\"]+)', home)
if match: download('hero', match.group(1))
(ROOT / 'scripts/asset-sources.json').write_text(json.dumps(manifest, indent=2) + '\n')

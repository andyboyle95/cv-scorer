#!/usr/bin/env python3
"""
Inlines the official O2 assets + shared model data into the two concept pages,
so each output is a single self-contained .html file that works offline.

Assets are downloaded from O2's own CDN (storyblok.cdn.vmo2digital.co.uk) and
o2.co.uk by fetch_assets.py. Nothing is redrawn or recreated.
"""
import base64, pathlib, re, sys

HERE = pathlib.Path(__file__).parent
OUT  = HERE.parent
ASSETS = HERE / 'assets'

def data_uri(path, mime):
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()

def build(template_name, out_name):
    html = (HERE / template_name).read_text()

    # shared model data
    models_js = (HERE / 'models.js').read_text()
    html = html.replace('/*__MODELS__*/', models_js)

    # O2 brand font (On Air variable, from O2's own CDN)
    html = html.replace('__FONT_ONAIR__', data_uri(ASSETS / 'onairvar.woff2', 'font/woff2'))

    # official O2 product photography
    for key in ['17', '17p', '17pm', '17e', 'air', 'fam16', 'fam15']:
        html = html.replace(f'__IMG_{key.upper()}__', data_uri(ASSETS / f'{key}.webp', 'image/webp'))

    # official O2 logo (kept as inline SVG markup, not a data URI, so it inherits colour)
    logo = (ASSETS / 'o2-logo.svg').read_text()
    logo = re.sub(r'<\?xml[^>]*\?>', '', logo).strip()
    logo = logo.replace('width="34px"', 'width="100%"').replace('height="35px"', 'height="100%"')
    html = html.replace('__LOGO_SVG__', logo)

    (OUT / out_name).write_text(html)
    kb = (OUT / out_name).stat().st_size / 1024
    print(f'{out_name}: {kb:.0f}KB')

if __name__ == '__main__':
    build('option-a.html', 'option-a-decision-led.html')
    build('option-b.html', 'option-b-scannable-table.html')

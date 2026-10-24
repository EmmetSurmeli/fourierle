"""Fetch the pinned, public-domain Natural Earth v5.1.2 country sources."""
from pathlib import Path
from urllib.request import urlretrieve
root = Path(__file__).resolve().parents[1] / 'source'
root.mkdir(exist_ok=True)
for scale in ('10m', '50m'):
    name = f'ne_{scale}_admin_0_countries.geojson'
    url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/{name}'
    path = root / name
    urlretrieve(url, path)
    print(path)

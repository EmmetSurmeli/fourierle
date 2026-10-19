"""Fetch the pinned, public-domain Natural Earth v5.1.2 source."""
from pathlib import Path
from urllib.request import urlretrieve
url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson'
p = Path(__file__).resolve().parents[1] / 'source/ne_50m_admin_0_countries.geojson'
p.parent.mkdir(exist_ok=True)
urlretrieve(url, p)
print(p)

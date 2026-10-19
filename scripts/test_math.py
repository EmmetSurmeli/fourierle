import hashlib
import json
import numpy as np
from pathlib import Path
from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from process import coefficients, reconstruct, resample, prepare, ROOT

def test_dft_and_negative_frequency():
    t=np.arange(512)*2*np.pi/512;z=2+3j+1.2*np.exp(2j*t)+.7j*np.exp(-3j*t)
    c,f=coefficients(z)
    assert abs(c[2]-1.2)<1e-12 and abs(c[-3]-.7j)<1e-12
    terms=[[int(k),float(v.real),float(v.imag)]for v,k in zip(c[1:],f[1:])]
    assert np.max(abs(reconstruct([2,3],terms)-z))<1e-12

def test_uniform_arclength():
    z=resample([[0,0],[2,0],[2,2],[0,2],[0,0]],32)
    assert np.allclose(abs(np.roll(z,-1)-z),.25)

def test_normalization_antimeridian_and_separate_polygons():
    f={'geometry':{'type':'MultiPolygon','coordinates':[[[[179,1],[180,1],[180,2],[179,2],[179,1]]],[[[-180,1],[-179,1],[-179,2],[-180,2],[-180,1]]]]}}
    rings,coverage=prepare(f,{})
    assert len(rings)==2 and coverage==1
    points=np.concatenate(rings);assert np.isclose(max(np.ptp(points,axis=0)),1)
    assert np.ptp(points[:,0])>np.ptp(points[:,1])

def test_entire_dataset_nested_quality_and_final_fidelity():
    reports=json.loads((ROOT/'public/data/calibration.json').read_text())
    assert len(reports)==189
    for r in reports:
        g=json.loads((ROOT/f'public/data/{r["id"]}.json').read_text())
        errors=[level['rmse'] for level in r['levels']]
        assert all(b<=a+1e-10 for a,b in zip(errors,errors[1:])),r['id']
        assert g['exactFallback'] or (r['levels'][-1]['fidelity']>=.999 and r['levels'][-1]['sourceHausdorff']<=.001)
        assert len(g['stages'])==6 and all(a<b for a,b in zip(g['stages'],g['stages'][1:]))
        assert len({(t[0],t[1])for t in g['terms']})==len(g['terms'])
        assert all(t[1]!=0 for t in g['terms'])
        assert all(len(c['exact'])>=4 for c in g['chains'])

def test_selection_comparison_has_real_metrics():
    r=json.loads((ROOT/'public/data/calibration.json').read_text())
    assert all(x['comparison']['magnitude8']['rmse']<=x['comparison']['pairedLowFrequency8']['rmse']+1e-9 for x in r)

def test_every_country_asset_matches_pinned_source_and_fourier_coefficients():
    source_path=ROOT/'source/ne_50m_admin_0_countries.geojson'
    source_bytes=source_path.read_bytes()
    source=json.loads(source_bytes)
    manifest=json.loads((ROOT/'source/manifest.json').read_text())
    assert hashlib.sha256(source_bytes).hexdigest()==manifest['sha256']

    features={f['properties']['ADM0_A3']:f for f in source['features']}
    for target,part in [('CYP','CYN'),('SOM','SOL')]:
        features[target]['geometry']=mapping(unary_union([
            shape(features[target]['geometry']),shape(features[part]['geometry'])
        ]))
    overrides=json.loads((ROOT/'scripts/overrides.json').read_text())
    index=json.loads((ROOT/'public/data/countries.json').read_text())
    pool=json.loads((ROOT/'src/pool.json').read_text())
    reports={r['id']:r for r in json.loads((ROOT/'public/data/calibration.json').read_text())}
    assets={p.stem for p in (ROOT/'public/data').glob('???.json')}
    ids=[country['id'] for country in index]
    assert len(ids)==189 and len(set(ids))==189
    assert ids==pool and set(ids)==assets==set(reports)
    expected_continents={'Africa','Asia','Europe','North America','South America','Oceania'}
    for country in index:
        id=country['id']
        expected='Africa' if id in {'MUS','SYC'} else features[id]['properties']['CONTINENT']
        assert country['continent']==expected and expected in expected_continents,id
        assert json.loads((ROOT/f'public/data/{id}.json').read_text())['stages'][1]==4,id

    for id in ids:
        geometry=json.loads((ROOT/f'public/data/{id}.json').read_text())
        rings,coverage=prepare(features[id],overrides.get(id,{}))
        assert geometry['id']==id
        assert len(rings)==len(geometry['chains'])>0
        assert abs(coverage-geometry['coverage'])<1e-10
        assert coverage>=.995,id
        sampled=[]
        for chain,ring in zip(geometry['chains'],rings):
            exact=np.asarray(chain['exact'])
            assert exact.shape==ring.shape
            assert np.max(np.abs(exact-ring))<=5.1e-7,id
            assert np.max(np.abs(exact))<=.500001,id
            z=resample(ring)
            coeff,_=coefficients(z)
            assert np.max(np.abs(np.array(chain['center'])-
                                 np.array([coeff[0].real,coeff[0].imag])))<1e-12,id
            sampled.append((z,coeff))
        for polygon,frequency,re,im in geometry['terms']:
            coefficient=sampled[polygon][1][frequency%512]
            assert abs(coefficient.real-re)<5.1e-9,id
            assert abs(coefficient.imag-im)<5.1e-9,id
        for stage,budget in enumerate(geometry['stages']):
            errors=[]
            for polygon,(z,_) in enumerate(sampled):
                terms=[t[1:] for t in geometry['terms'][:budget] if t[0]==polygon]
                approx=reconstruct(geometry['chains'][polygon]['center'],terms)
                errors.append(float(np.sqrt(np.mean(np.abs(z-approx)**2))))
            reported=reports[id]['levels'][stage]
            assert abs((1-max(errors))-reported['fidelity'])<1e-6,(id,stage)
            assert abs(np.sqrt(np.mean(np.square(errors)))-reported['rmse'])<1e-6,(id,stage)
        if geometry['exactFallback']:
            # The sixth-stage display uses the serialized source rings directly.
            assert all(len(chain['exact'])>=4 for chain in geometry['chains']),id

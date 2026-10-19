import json
import numpy as np
from pathlib import Path
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

"""Reproducible geometry, DFT, and calibration pipeline. No runtime GIS dependencies."""
import json, math, hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon, LineString, shape, mapping
from shapely.ops import unary_union
ROOT = Path(__file__).resolve().parents[1]
N = 512
DISPLAY_TOLERANCE = .00075  # Below one quarter of a pixel in the 340px puzzle canvas.
FINAL_HAUSDORFF = .001  # Sampled Fourier outline must be within about one third of a pixel.

def resample(points, n=N):
    p = np.asarray(points, dtype=float)
    if not np.allclose(p[0],p[-1]): p=np.vstack([p,p[0]])
    d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(p,axis=0),axis=1))]
    keep=np.r_[True,np.diff(d)>1e-12]; p=p[keep]; d=d[keep]
    t=np.arange(n)*d[-1]/n
    return np.interp(t,d,p[:,0])+1j*np.interp(t,d,p[:,1])

def coefficients(z):
    c=np.fft.fft(z)/len(z)
    f=np.fft.fftfreq(len(z),1/len(z)).astype(int)
    return c,f

def reconstruct(center, terms, n=N):
    t=np.arange(n)*2*np.pi/n
    out=np.full(n,complex(*center))
    for freq,re,im in terms: out+=(re+1j*im)*np.exp(1j*freq*t)
    return out

def prepare(feature, override):
    g=feature['geometry']; polygons=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    rings=[np.array(p[0],float) for p in polygons]
    if 'bounds' in override:
        a,b,c,d=override['bounds']; rings=[r for r in rings if a<=r[:,0].mean()<=c and b<=r[:,1].mean()<=d]
    # Place the longitude seam in the largest empty gap, keeping antimeridian islands adjacent.
    all_lon=np.concatenate([r[:,0] for r in rings])%360
    v=np.sort(all_lon); gaps=np.diff(np.r_[v,v[0]+360]); start=v[(np.argmax(gaps)+1)%len(v)]
    lat=np.concatenate([r[:,1] for r in rings]).mean()
    rings=[np.column_stack([((r[:,0]-start)%360)*math.cos(math.radians(lat)),-r[:,1]]) for r in rings]
    rings.sort(key=lambda r:abs(Polygon(r).area),reverse=True)
    total=sum(abs(Polygon(r).area) for r in rings)
    kept=[]; area=0
    for r in rings:
        kept.append(r); area+=abs(Polygon(r).area)
        if area/total>=.995 or len(kept)>=160: break
    points=np.concatenate(kept); lo=points.min(axis=0); hi=points.max(axis=0)
    center=(lo+hi)/2; scale=max(hi-lo)
    normalized=[(r-center)/scale for r in kept]
    # Keep the 1:10m detail visible at game size without shipping thousands of subpixel points.
    simplified=[np.asarray(Polygon(r).simplify(DISPLAY_TOLERANCE,preserve_topology=True).exterior.coords) for r in normalized]
    return simplified,area/total

def metric(z, approx):
    rmse=float(np.sqrt(np.mean(np.abs(z-approx)**2)))
    p=Polygon(np.c_[z.real,z.imag]).buffer(0); q=Polygon(np.c_[approx.real,approx.imag]).buffer(0)
    area=float(abs(q.area-p.area)/max(p.area,1e-12))
    distance=float(LineString(np.c_[z.real,z.imag]).hausdorff_distance(LineString(np.c_[approx.real,approx.imag])))
    aspect=lambda x: float(np.ptp(x.real)/max(np.ptp(x.imag),1e-9))
    return {'rmse':rmse,'fidelity':max(0,1-rmse),'hausdorff':distance,'areaError':area,'aspectError':abs(aspect(z)-aspect(approx))/max(aspect(z),1e-9)}

def main():
    source=ROOT/'source/ne_10m_admin_0_countries.geojson'; features=json.loads(source.read_text())['features']
    overrides=json.loads((ROOT/'scripts/overrides.json').read_text())
    # Use a sovereign-country game pool; merge separately mapped disputed units.
    for target,part in [('CYP','CYN'),('SOM','SOL')]:
        base=next(f for f in features if f['properties']['ADM0_A3']==target)
        extra_feature=next(f for f in features if f['properties']['ADM0_A3']==part)
        base['geometry']=mapping(unary_union([shape(base['geometry']),shape(extra_feature['geometry'])]))
    extra={'USA','GBR','NZL','NLD','KAZ','ISR','PSX','FRA','FIN','DNK','CUB','CHN','AUS'}
    excluded={'VAT','CYN','SOL','KIR','FSM','MHL','PLW','TON','MDV'} # The frozen schedule excludes these countries.
    names={'CHN':'China','CIV':'Côte d’Ivoire','CPV':'Cabo Verde','TLS':'Timor-Leste','USA':'United States','TUR':'Türkiye','CZE':'Czechia','COD':'Democratic Republic of the Congo','COG':'Republic of the Congo','PSX':'Palestine'}
    aliases={'USA':['USA','US','United States of America','America'],'GBR':['UK','Britain','Great Britain'],'TUR':['Turkey'],'CZE':['Czech Republic'],'COD':['DR Congo','DRC','Congo Kinshasa'],'COG':['Congo','Congo Brazzaville'],'CIV':['Ivory Coast'],'SWZ':['Swaziland'],'TLS':['East Timor'],'KOR':['South Korea'],'PRK':['North Korea'],'MMR':['Burma'],'MKD':['Macedonia'],'CPV':['Cape Verde']}
    eligible=sorted(f['properties']['ADM0_A3'] for f in features if (f['properties']['TYPE']=='Sovereign country' or f['properties']['ADM0_A3'] in extra) and f['properties']['ADM0_A3'] not in excluded)
    frozen=ROOT/'src/pool.json'
    if frozen.exists() and json.loads(frozen.read_text())!=eligible:
        raise RuntimeError('Published v1 pool is frozen. Introduce a dated v2 schedule before changing eligibility; do not overwrite historical puzzles.')
    index=[]; reports=[]; signatures=[]
    out=ROOT/'public/data'; out.mkdir(exist_ok=True)
    for f in sorted(features,key=lambda f:f['properties']['ADM0_A3']):
        p=f['properties']; id=p['ADM0_A3']
        if (p['TYPE']!='Sovereign country' and id not in extra) or id in excluded: continue
        rings,coverage=prepare(f,overrides.get(id,{})); chains=[]; all_terms=[]; zs=[]
        for j,r in enumerate(rings):
            z=resample(r); zs.append(z); cs,fs=coefficients(z)
            chains.append({'center':[float(cs[0].real),float(cs[0].imag)],'exact':r.round(6).tolist()})
            for c,freq in zip(cs[1:],fs[1:]): all_terms.append([j,int(freq),float(c.real),float(c.imag)])
        magnitude=sorted(all_terms,key=lambda t:-(t[2]**2+t[3]**2))
        # A non-elliptical second harmonic is useful when it carries >=15% of the leading radius.
        selected=magnitude.copy()
        candidate=next((t for t in selected[1:] if t[0]==selected[0][0] and abs(t[1])>1 and math.hypot(t[2],t[3])>=.15*math.hypot(*selected[0][2:])),None)
        if candidate:
            j=selected[0][0]
            trial=reconstruct(chains[j]['center'],[selected[0][1:],candidate[1:]])
            original=zs[j]
            aspect=lambda z: np.ptp(z.real)/max(np.ptp(z.imag),1e-9)
            ratio=aspect(trial)/aspect(original)
            # Do not turn long, narrow countries into generic rounded triangles.
            if .6 <= ratio <= 1.67:
                selected.remove(candidate); selected.insert(1,candidate)
        low=sorted(all_terms,key=lambda t:(abs(t[1]),t[0],t[1]))
        budgets=overrides.get(id,{}).get('stages',[2,4,8,16,32])
        if len(budgets)!=5 or any(not isinstance(b,int) or b<1 or b>128 for b in budgets) or any(a>=b for a,b in zip(budgets,budgets[1:])):
            raise ValueError(f'{id}: stages must be five strictly increasing integer budgets from 1 to 128')
        # Preserve all early reveals, then give every retained island a rotating chain by round six.
        first=selected[:budgets[-1]]
        missing=sorted({j for j in range(len(rings))}-{t[0] for t in first})
        island_starters=[next(t for t in selected[budgets[-1]:] if t[0]==j) for j in missing]
        starter_keys={(t[0],t[1]) for t in island_starters}
        selected=first+island_starters+[t for t in selected[budgets[-1]:] if (t[0],t[1]) not in starter_keys]
        def evaluate(terms):
            ms=[metric(z,reconstruct(chains[j]['center'],[t[1:] for t in terms if t[0]==j])) for j,z in enumerate(zs)]
            return {'rmse':math.sqrt(sum(m['rmse']**2 for m in ms)/len(ms)), 'fidelity':1-max(m['rmse'] for m in ms), 'hausdorff':max(m['hausdorff'] for m in ms),'areaError':max(m['areaError'] for m in ms),'aspectError':max(m['aspectError'] for m in ms)}
        final=min(128,len(selected))
        while final<min(1024,len(selected)):
            quality=evaluate(selected[:final])
            if quality['fidelity']>=.999 and quality['hausdorff']<=FINAL_HAUSDORFF: break
            final=min(final*2,1024,len(selected))
        budgets=budgets+[final]
        levels=[evaluate(selected[:b]) for b in budgets]
        source_distance=max(float(LineString(r).hausdorff_distance(LineString(np.c_[np.r_[a.real,a.real[0]],np.r_[a.imag,a.imag[0]]]))) for j,r in enumerate(rings) for a in [reconstruct(chains[j]['center'],[t[1:] for t in selected[:final] if t[0]==j])])
        fallback=levels[-1]['fidelity']<.999 or source_distance>.001
        levels[-1]['sourceHausdorff']=source_distance
        name=names.get(id,p['NAME_EN'])
        # Natural Earth labels these two Indian Ocean islands as open ocean; UN M49 groups both in Africa.
        continent='Africa' if id in {'MUS','SYC'} else p['CONTINENT']
        index.append({'id':id,'name':name,'aliases':sorted(set(aliases.get(id,[])+[p['NAME_LONG'],p['ADMIN']])), 'continent':continent})
        data={'id':id,'name':name,'chains':chains,'terms':[[t[0],t[1],round(t[2],8),round(t[3],8)] for t in selected[:final]],'stages':budgets,'exactFallback':fallback,'note':overrides.get(id,{}).get('note',''),'coverage':coverage}
        (out/f'{id}.json').write_text(json.dumps(data,separators=(',',':')))
        reports.append({'id':id,'name':name,'polygons':len(chains),'retainedArea':coverage,'stages':budgets,'levels':levels,'exactFallback':fallback,'comparison':{'pairedLowFrequency8':evaluate(low[:8]),'magnitude8':evaluate(magnitude[:8])}})
        # Rotation/start-point invariant coarse spectrum + geographical aspect captures ambiguity, not human skill.
        z=zs[0]; c,_=coefficients(z); signatures.append([np.ptp(z.real),np.ptp(z.imag)]+[float(abs(c[k])+abs(c[-k])) for k in range(1,5)])
    s=np.array(signatures)
    for i,r in enumerate(reports):
        ds=np.linalg.norm(s-s[i],axis=1); ds[i]=np.inf; near=np.argsort(ds)[:3]
        r['similarEarlyShapes']=[{'id':reports[j]['id'],'distance':float(ds[j])} for j in near]
        r['reviewRecommended']=bool(ds[near[0]]<.035 or r['retainedArea']<.99)
    for stale in out.glob('???.json'):
        if stale.stem not in {x['id'] for x in index}: stale.unlink()
    (out/'countries.json').write_text(json.dumps(index,separators=(',',':')))
    (ROOT/'src/pool.json').write_text(json.dumps([x['id'] for x in index]))
    (out/'calibration.json').write_text(json.dumps(reports,separators=(',',':')))
    (ROOT/'source/manifest.json').write_text(json.dumps({'source':'Natural Earth','version':'5.1.2','scale':'1:10m','license':'Public domain','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'countries':len(index),'samplesPerPolygon':N,'displayTolerance':DISPLAY_TOLERANCE,'finalSampledHausdorffTarget':FINAL_HAUSDORFF},indent=2))
    print(f'Generated {len(index)} countries; {sum(r["exactFallback"] for r in reports)} exact final-stage fallbacks; {sum(r["reviewRecommended"] for r in reports)} review flags.')
if __name__=='__main__': main()

"""Simulation d'un joueur qui réinvestit (outil d'équilibrage de l'économie).

Le joueur achète toujours l'action au meilleur temps de retour (coût / gain de
revenu par seconde) parmi les produits, les managers et les cash upgrades.
Sans manager, un produit ne tourne qu'à TAUX_MANUEL (par défaut 50 %) : le
joueur ne peut pas cliquer partout en même temps. Les règles reproduisent
celles du backend (coût géométrique, paliers, paliers globaux, bonus).

Utilisation, depuis backend/ :
    python scripts/simuler-joueur.py src/origworld.ts [durée en heures]
    TAUX_MANUEL=0.2 python scripts/simuler-joueur.py src/origworld.ts 2   (joueur moins attentif)

Affiche toutes les 15 minutes le score cumulé, le nombre d'anges qu'un reset
rapporterait (formule 150 * sqrt(score / 10^15)) et les quantités possédées,
puis les dates d'achat du premier exemplaire de chaque produit et manager."""
import re, sys, math, copy, json

def charger(path):
    s = open(path, encoding='utf-8').read()
    pal = r"\{ name: (['\"])(.*?)\1, logo: '[^']*', seuil: ([\d.e]+), idcible: (-?\d+), ratio: ([\d.]+), typeratio: RatioType\.(\w+), unlocked: false \}"
    prods = []
    for m in re.finditer(r"id: (\d+),\s*name: '([^']*)',\s*logo: '[^']*',\s*cout: ([\d.e]+),\s*croissance: ([\d.]+),\s*revenu: ([\d.e]+),\s*vitesse: (\d+),\s*quantite: (\d+).*?paliers: \[(.*?)\]", s, re.S):
        i, n, c, g, r, v, q, p = m.groups()
        prods.append(dict(id=int(i), name=n, cout=float(c), crois=float(g), rev=float(r), vit=float(v), q=int(q), managed=False,
                          paliers=[dict(name=x[1], seuil=float(x[2]), cible=int(x[3]), ratio=float(x[4]), type=x[5], ok=False) for x in re.findall(pal, p)]))
    def section(name):
        i = s.index('\n  ' + name + ':'); j = s.index('],', i)
        return [dict(name=x[1], seuil=float(x[2]), cible=int(x[3]), ratio=float(x[4]), type=x[5], ok=False) for x in re.findall(pal, s[i:j])]
    return dict(products=prods, allunlocks=section('allunlocks'), upgrades=section('upgrades'), managers=section('managers'), money=0.0, score=0.0)

def bonus(w, p):
    if p['type'] == 'ange': return
    for pr in w['products']:
        if p['cible'] == 0 or pr['id'] == p['cible']:
            if p['type'] == 'gain': pr['rev'] *= p['ratio']
            elif p['type'] == 'vitesse': pr['vit'] = max(1, round(pr['vit'] / p['ratio']))

def unlocks(w, pr):
    for p in pr['paliers']:
        if not p['ok'] and pr['q'] >= p['seuil']: p['ok'] = True; bonus(w, p)
    for p in w['allunlocks']:
        if not p['ok'] and all(x['q'] >= p['seuil'] for x in w['products']): p['ok'] = True; bonus(w, p)

def revenu(w):
    return sum(pr['q'] * pr['rev'] * 1000 / pr['vit'] * (1 if pr['managed'] else float(__import__('os').environ.get('TAUX_MANUEL', '0.5'))) for pr in w['products'])

def cout_n(pr, n):
    return pr['cout'] * (pr['crois'] ** n - 1) / (pr['crois'] - 1)

def actions(w):
    for k, pr in enumerate(w['products']):
        prochains = [p['seuil'] - pr['q'] for p in pr['paliers'] if not p['ok']] + [x['seuil'] - pr['q'] for x in w['allunlocks'] if not x['ok'] and x['seuil'] > pr['q']]
        n = max(1, min([10] + [int(d) for d in prochains if d > 0]))
        yield ('prod', k, n), cout_n(pr, n)
    for k, m in enumerate(w['managers']):
        if not m['ok']: yield ('mgr', k, 0), m['seuil']
    for k, u in enumerate(w['upgrades']):
        if not u['ok']: yield ('up', k, 0), u['seuil']

def appliquer(w, a):
    kind, k, n = a
    if kind == 'prod':
        pr = w['products'][k]; c = cout_n(pr, n); w['money'] -= c
        pr['q'] += n; pr['cout'] *= pr['crois'] ** n; unlocks(w, pr)
    elif kind == 'mgr':
        m = w['managers'][k]; w['money'] -= m['seuil']; m['ok'] = True
        for pr in w['products']:
            if pr['id'] == m['cible']: pr['managed'] = True
    else:
        u = w['upgrades'][k]; w['money'] -= u['seuil']; u['ok'] = True; bonus(w, u)

def simuler(w, duree_h=3, verbose=True):
    t = 0; jalons = {}; base = revenu(w)
    seuil1 = 1e15 / 150 ** 2; seuil10 = 1e15 * (10 / 150) ** 2
    while t <= duree_h * 3600:
        while True:
            r0 = revenu(w); best = None
            for a, c in actions(w):
                if c <= 0: continue
                w2 = copy.deepcopy(w); w2['money'] = 1e300; appliquer(w2, a)
                d = revenu(w2) - r0
                if d <= 0: continue
                pb = c / d
                if best is None or pb < best[0]: best = (pb, a, c)
            if best and best[2] <= w['money']:
                appliquer(w, best[1])
                kind, k, n = best[1]
                if kind == 'prod' and w['products'][k]['q'] == n and k > 0: jalons.setdefault(f"produit {k+1}", t)
                if kind == 'mgr': jalons.setdefault(f"manager {k+1}", t)
            else:
                break
        g = revenu(w); w['money'] += g; w['score'] += g
        if w['score'] >= seuil1: jalons.setdefault('1er ange', t)
        if w['score'] >= seuil10: jalons.setdefault('10 anges', t)
        if verbose and t % 900 == 0 and t > 0:
            print(f"t={t/60:5.0f} min  score={w['score']:.2e}  anges={math.floor(150*math.sqrt(w['score']/1e15))}  quantités={[p['q'] for p in w['products']]}")
        t += 1
    return jalons

if __name__ == '__main__':
    w = charger(sys.argv[1])
    j = simuler(w, float(sys.argv[2]) if len(sys.argv) > 2 else 3)
    print({k: f"{v/60:.1f} min" for k, v in sorted(j.items(), key=lambda x: x[1])})

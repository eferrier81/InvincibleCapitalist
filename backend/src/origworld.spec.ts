import fs from 'fs';
import path from 'path';
import { origworld } from './origworld.js';

/** Tous les chemins `logo` du monde initial : monde, produits, paliers, upgrades, managers. */
function tousLesLogos(): { nom: string; logo: string }[] {
  const logos = [{ nom: origworld.name, logo: origworld.logo }];
  for (const produit of origworld.products) {
    logos.push({ nom: produit.name, logo: produit.logo });
    for (const palier of produit.paliers) logos.push({ nom: palier.name, logo: palier.logo });
  }
  for (const liste of [origworld.allunlocks, origworld.upgrades, origworld.angelupgrades, origworld.managers]) {
    for (const palier of liste) logos.push({ nom: palier.name, logo: palier.logo });
  }
  return logos;
}

describe('origworld : icônes', () => {
  const logos = tousLesLogos();

  it('référence une image existante dans public/ pour chaque élément', () => {
    const manquants = logos.filter(({ logo }) => !fs.existsSync(path.join(process.cwd(), 'public', logo)));
    expect(manquants).toEqual([]);
  });

  it('utilise une image différente pour chaque élément', () => {
    const vus = new Map<string, string>();
    const doublons: string[] = [];
    for (const { nom, logo } of logos) {
      if (vus.has(logo)) doublons.push(`${logo} (${vus.get(logo)} / ${nom})`);
      vus.set(logo, nom);
    }
    expect(doublons).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { PalierFieldsFragment, ProductFieldsFragment, RatioType, WorldFieldsFragment } from './graphql';
import { applyBonus, applyUnlocks, calculerAngesGagnes, coutAchat, maxAffordable, nextToBuy } from './game-rules';

const palier = (overrides: Partial<PalierFieldsFragment> = {}): PalierFieldsFragment => ({
  name: 'bonus',
  logo: '',
  seuil: 10,
  idcible: 1,
  ratio: 2,
  typeratio: RatioType.Gain,
  unlocked: false,
  ...overrides,
});

const product = (overrides: Partial<ProductFieldsFragment> = {}): ProductFieldsFragment => ({
  id: 1,
  name: 'Produit',
  logo: '',
  cout: 10,
  croissance: 1.1,
  revenu: 10,
  vitesse: 100,
  quantite: 1,
  timeleft: 0,
  managerUnlocked: false,
  paliers: [],
  ...overrides,
});

const world = (overrides: Partial<WorldFieldsFragment> = {}): WorldFieldsFragment => ({
  name: 'Monde',
  logo: '',
  money: 0,
  score: 0,
  totalangels: 0,
  activeangels: 0,
  angelbonus: 2,
  lastupdate: '',
  products: [product()],
  allunlocks: [],
  upgrades: [],
  angelupgrades: [],
  managers: [],
  ...overrides,
});

describe('game rules', () => {
  it('calculates geometric purchase costs', () => {
    expect(coutAchat({ cout: 10, croissance: 1.1 }, 3)).toBeCloseTo((10 * (1.1 ** 3 - 1)) / 0.1);
    expect(coutAchat({ cout: 10, croissance: 1 }, 3)).toBe(30);
  });

  it('calculates the maximum affordable quantity', () => {
    expect(maxAffordable({ cout: 10, croissance: 1.1 }, 500)).toBe(18);
    expect(maxAffordable({ cout: 10, croissance: 1 }, 35)).toBe(3);
  });

  it('calculates the quantity needed for the next product threshold', () => {
    const current = product({
      quantite: 7,
      paliers: [palier({ seuil: 20 }), palier({ seuil: 10 }), palier({ seuil: 30 })],
    });

    expect(nextToBuy(current)).toBe(3);
    expect(nextToBuy(product({ quantite: 30, paliers: [palier({ seuil: 20 }), palier({ seuil: 30 })] }))).toBeNull();
  });

  it('applies gain, rounded speed, global and angel bonuses without mutating the input', () => {
    const initial = world({ products: [product({ vitesse: 5 }), product({ id: 2, vitesse: 8 })] });
    const gain = applyBonus(initial, palier({ idcible: 1, ratio: 3 }));
    expect(gain.products[0].revenu).toBe(30);
    expect(gain.products[1].revenu).toBe(10);

    const speed = applyBonus(initial, palier({ typeratio: RatioType.Vitesse, idcible: 1, ratio: 2 }));
    expect(speed.products[0].vitesse).toBe(3);
    expect(speed.products[1].vitesse).toBe(8);

    const global = applyBonus(initial, palier({ idcible: 0, ratio: 2 }));
    expect(global.products.every((p) => p.revenu === 20)).toBe(true);
    const angels = applyBonus(initial, palier({ typeratio: RatioType.Ange, ratio: 3 }));
    expect(angels.angelbonus).toBe(6);
    expect(initial.products[0].revenu).toBe(10);
  });

  it('applies each product and global unlock once and only when all products qualify', () => {
    const initial = world({
      products: [product({ quantite: 2, paliers: [palier({ seuil: 2 })] }), product({ id: 2, quantite: 1 })],
      allunlocks: [palier({ name: 'global', idcible: 0, seuil: 2 })],
    });
    const first = applyUnlocks(initial, firstProduct(initial));
    expect(first.products[0].paliers[0].unlocked).toBe(true);
    expect(first.products[0].revenu).toBe(20);
    expect(first.allunlocks[0].unlocked).toBe(false);

    const complete = applyUnlocks({ ...first, products: first.products.map((p) => ({ ...p, quantite: 2 })) }, first.products[1]);
    expect(complete.allunlocks[0].unlocked).toBe(true);
    expect(complete.products[0].revenu).toBe(40);
    expect(applyUnlocks(complete, complete.products[1]).products[0].revenu).toBe(40);
  });

  it('calculates non-negative floored angel gains', () => {
    expect(calculerAngesGagnes({ score: 1e15, totalangels: 10 })).toBe(140);
    expect(calculerAngesGagnes({ score: 0, totalangels: 10 })).toBe(0);
  });
});

function firstProduct(currentWorld: WorldFieldsFragment): ProductFieldsFragment {
  return currentWorld.products[0];
}

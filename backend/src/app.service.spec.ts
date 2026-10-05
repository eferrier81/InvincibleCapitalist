import { describe, expect, it, vi } from 'vitest';
import { AppService } from './app.service.js';
import { origworld } from './origworld.js';
import { Palier, Product, RatioType, World } from './graphql.js';

const makeWorld = (): World => structuredClone(origworld) as World;

const makePalier = (overrides: Partial<Palier> = {}): Palier => ({
  name: 'bonus',
  logo: '',
  seuil: 10,
  idcible: 1,
  ratio: 2,
  typeratio: RatioType.gain,
  unlocked: false,
  ...overrides,
});

describe('AppService game rules', () => {
  it('calculates geometric purchase costs', () => {
    const service = new AppService();
    expect(service.coutAchat({ cout: 10, croissance: 1.1 } as Product, 3)).toBeCloseTo((10 * (1.1 ** 3 - 1)) / 0.1);
    expect(service.coutAchat({ cout: 10, croissance: 1 } as Product, 3)).toBe(30);
  });

  it('applies gain, rounded speed, global and angel bonuses', () => {
    const service = new AppService();
    const world = makeWorld();
    const target = world.products[0];
    const other = world.products[1];
    service.applyBonus(world, makePalier({ idcible: target.id, typeratio: RatioType.gain, ratio: 3 }));
    expect(target.revenu).toBe(3);
    service.applyBonus(world, makePalier({ idcible: target.id, typeratio: RatioType.vitesse, ratio: 2 }));
    expect(target.vitesse).toBe(250);
    service.applyBonus(world, makePalier({ idcible: 0, typeratio: RatioType.gain, ratio: 2 }));
    expect(other.revenu).toBe(24);
    service.applyBonus(world, makePalier({ typeratio: RatioType.ange, ratio: 3 }));
    expect(world.angelbonus).toBe(6);
  });

  it('unlocks product thresholds once and global thresholds only when all products qualify', () => {
    const service = new AppService();
    const world = makeWorld();
    const product = world.products[0];
    product.quantite = 20;
    const productPalier = makePalier({ seuil: 20, idcible: product.id });
    product.paliers = [productPalier];
    const global = makePalier({ name: 'global', seuil: 20, idcible: 0 });
    world.allunlocks = [global];

    service.checkUnlocks(world, product);
    expect(productPalier.unlocked).toBe(true);
    expect(product.revenu).toBe(2);
    expect(global.unlocked).toBe(false);
    product.quantite = 20;
    for (const candidate of world.products) candidate.quantite = 20;
    service.checkUnlocks(world, product);
    expect(global.unlocked).toBe(true);
    expect(product.revenu).toBe(4);
    service.checkUnlocks(world, product);
    expect(product.revenu).toBe(4);
  });

  it('calculates non-negative floored angel gains', () => {
    const service = new AppService();
    expect(service.calculerAngesGagnes({ score: 1e15, totalangels: 10 } as World)).toBe(140);
    expect(service.calculerAngesGagnes({ score: 0, totalangels: 10 } as World)).toBe(0);
  });

  it('creates a reset world with preserved score and accumulated angels', () => {
    const service = new AppService();
    const world = makeWorld();
    world.score = 1e12;
    world.totalangels = 4;
    world.activeangels = 2;
    const reset = service.creerNouveauMonde(world, 7);
    expect(reset.score).toBe(world.score);
    expect(reset.totalangels).toBe(11);
    expect(reset.activeangels).toBe(9);
    expect(reset.products[0].quantite).toBe(1);
    expect(reset.products.slice(1).every((p) => p.quantite === 0)).toBe(true);
  });

  it('credits one offline cycle without a manager and all complete cycles with one', () => {
    const service = new AppService();
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const noManager = makeWorld();
    const first = noManager.products[0];
    first.quantite = 2;
    first.revenu = 10;
    first.vitesse = 1000;
    first.timeleft = 1000;
    first.managerUnlocked = false;
    noManager.lastupdate = new Date(now - 1000).toISOString();
    (service as unknown as { updateWorld(world: World): void }).updateWorld(noManager);
    expect(noManager.money).toBe(20);
    expect(first.timeleft).toBe(0);

    const managerWorld = makeWorld();
    const managed = managerWorld.products[0];
    managed.quantite = 2;
    managed.revenu = 10;
    managed.vitesse = 1000;
    managed.timeleft = 500;
    managed.managerUnlocked = true;
    managerWorld.lastupdate = new Date(now - 2500).toISOString();
    (service as unknown as { updateWorld(world: World): void }).updateWorld(managerWorld);
    expect(managerWorld.money).toBe(60);
    expect(managed.timeleft).toBe(1000);
    vi.restoreAllMocks();
  });
});

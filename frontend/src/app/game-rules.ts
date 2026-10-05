import { PalierFieldsFragment, ProductFieldsFragment, RatioType, WorldFieldsFragment } from './graphql';

export function coutAchat(
  product: Pick<ProductFieldsFragment, 'cout' | 'croissance'>,
  quantite: number,
): number {
  if (quantite <= 0) return 0;
  if (product.croissance === 1) return product.cout * quantite;
  return (product.cout * (Math.pow(product.croissance, quantite) - 1)) / (product.croissance - 1);
}

export function maxAffordable(
  product: Pick<ProductFieldsFragment, 'cout' | 'croissance'>,
  money: number,
): number {
  if (money <= 0 || product.cout <= 0) return 0;
  if (product.croissance === 1) return Math.floor(money / product.cout);
  const n = Math.floor(
    Math.log((money * (product.croissance - 1)) / product.cout + 1) / Math.log(product.croissance),
  );
  return Math.max(0, n);
}

export function applyBonus(world: WorldFieldsFragment, palier: PalierFieldsFragment): WorldFieldsFragment {
  const nextWorld = structuredClone(world);
  if (palier.typeratio === RatioType.Ange) {
    nextWorld.angelbonus *= palier.ratio;
    return nextWorld;
  }

  const targets = palier.idcible > 0 ? nextWorld.products.filter((p) => p.id === palier.idcible) : nextWorld.products;
  for (const target of targets) {
    if (palier.typeratio === RatioType.Gain) {
      target.revenu *= palier.ratio;
    } else if (palier.typeratio === RatioType.Vitesse) {
      target.vitesse = Math.max(1, Math.round(target.vitesse / palier.ratio));
    }
  }
  return nextWorld;
}

export function applyUnlocks(world: WorldFieldsFragment, product: ProductFieldsFragment): WorldFieldsFragment {
  let nextWorld = structuredClone(world);
  const nextProduct = nextWorld.products.find((candidate) => candidate.id === product.id);
  if (!nextProduct) return nextWorld;

  for (const palier of nextProduct.paliers) {
    if (!palier.unlocked && nextProduct.quantite >= palier.seuil) {
      palier.unlocked = true;
      nextWorld = applyBonus(nextWorld, palier);
    }
  }

  for (const palier of nextWorld.allunlocks) {
    if (!palier.unlocked && nextWorld.products.every((candidate) => candidate.quantite >= palier.seuil)) {
      palier.unlocked = true;
      nextWorld = applyBonus(nextWorld, palier);
    }
  }
  return nextWorld;
}

export function calculerAngesGagnes(world: Pick<WorldFieldsFragment, 'score' | 'totalangels'>): number {
  const total = 150 * Math.sqrt(world.score / 1e15);
  return Math.max(0, Math.floor(total - world.totalangels));
}

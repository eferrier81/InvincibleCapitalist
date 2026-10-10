import { RatioType, type World, type Product, type Palier } from '../src/graphql.js';
import { origworld } from '../src/origworld.js';

type Milestones = {
  firstProduct: number | null;
  secondProduct: number | null;
  firstManager: number | null;
  products: Array<number | null>;
  managers: Array<number | null>;
  angels: number | null;
};

const HOUR = 60 * 60;
const STEP_MS = 1000;
const MAX_TIME = 4 * HOUR;

function formatMinutes(seconds: number | null): string {
  return seconds === null ? 'non atteint' : `${(seconds / 60).toFixed(1)} min`;
}

function cost(product: Product, quantity: number): number {
  if (product.croissance === 1) return product.cout * quantity;
  return (product.cout * (product.croissance ** quantity - 1)) / (product.croissance - 1);
}

function applyBonus(world: World, palier: Palier): void {
  if (palier.typeratio === RatioType.ange) {
    world.angelbonus *= palier.ratio;
    return;
  }

  const targets = palier.idcible > 0
    ? world.products.filter((product) => product.id === palier.idcible)
    : world.products;

  for (const product of targets) {
    if (palier.typeratio === RatioType.gain) product.revenu *= palier.ratio;
    if (palier.typeratio === RatioType.vitesse) {
      product.vitesse = Math.max(1, Math.round(product.vitesse / palier.ratio));
    }
  }
}

function checkUnlocks(world: World, product: Product): void {
  for (const palier of product.paliers) {
    if (!palier.unlocked && product.quantite >= palier.seuil) {
      palier.unlocked = true;
      applyBonus(world, palier);
    }
  }

  for (const palier of world.allunlocks) {
    if (!palier.unlocked && world.products.every((candidate) => candidate.quantite >= palier.seuil)) {
      palier.unlocked = true;
      applyBonus(world, palier);
    }
  }
}

function simulate(source: World): { milestones: Milestones; world: World } {
  const world = structuredClone(source) as World;
  const milestones: Milestones = {
    firstProduct: null,
    secondProduct: null,
    firstManager: null,
    products: world.products.map(() => null),
    managers: world.managers.map(() => null),
    angels: null,
  };
  let seconds = 0;
  let score = 0;

  world.products[0].timeleft = world.products[0].vitesse;
  milestones.products[0] = 0;

  while (seconds <= MAX_TIME) {
    for (const product of world.products) {
      if (product.quantite <= 0) continue;

      if (product.managerUnlocked) {
        const cycles = Math.floor((STEP_MS + product.vitesse - product.timeleft) / product.vitesse);
        if (cycles > 0) {
          const gain = product.quantite * product.revenu *
            (1 + (world.activeangels * world.angelbonus) / 100) * cycles;
          world.money += gain;
          score += gain;
        }
        product.timeleft = product.vitesse - ((STEP_MS + product.vitesse - product.timeleft) % product.vitesse);
      } else if (product.timeleft > 0) {
        product.timeleft -= STEP_MS;
        if (product.timeleft <= 0) {
          const gain = product.quantite * product.revenu *
            (1 + (world.activeangels * world.angelbonus) / 100);
          world.money += gain;
          score += gain;
          product.timeleft = product.vitesse;
        }
      }
    }

    for (let i = 0; i < world.managers.length; i += 1) {
      const manager = world.managers[i];
      if (!manager.unlocked && world.money >= manager.seuil) {
        world.money -= manager.seuil;
        manager.unlocked = true;
        const product = world.products.find((candidate) => candidate.id === manager.idcible);
        if (product) {
          product.managerUnlocked = true;
          product.timeleft = product.vitesse;
        }
        milestones.managers[i] = seconds;
        milestones.firstManager ??= seconds;
      }
    }

    for (let i = 1; i < world.products.length; i += 1) {
      const product = world.products[i];
      if (product.quantite === 0 && world.money >= product.cout) {
        world.money -= product.cout;
        product.quantite = 1;
        product.cout *= product.croissance;
        product.timeleft = product.vitesse;
        checkUnlocks(world, product);
        milestones.products[i] = seconds;
        milestones.secondProduct ??= i === 1 ? seconds : milestones.secondProduct;
        break;
      }
    }

    if (world.money >= world.products[0].cout) {
      const quantity = Math.min(10, Math.floor(Math.log(
        1 + (world.money * (world.products[0].croissance - 1)) / world.products[0].cout,
      ) / Math.log(world.products[0].croissance)));
      if (quantity > 0) {
        const amount = cost(world.products[0], quantity);
        world.money -= amount;
        world.products[0].quantite += quantity;
        world.products[0].cout *= world.products[0].croissance ** quantity;
        checkUnlocks(world, world.products[0]);
      }
    }

    if (score >= 1e15 / 225 && milestones.angels === null) {
      milestones.angels = seconds;
    }

    seconds += 1;
  }

  world.score = score;
  return { milestones, world };
}

function printResult(label: string, result: ReturnType<typeof simulate>): void {
  const { milestones, world } = result;
  console.log(`\n${label}`);
  console.log(`- Premier produit : ${formatMinutes(milestones.products[0])}`);
  console.log(`- 2e produit : ${formatMinutes(milestones.secondProduct)}`);
  console.log(`- Premier manager : ${formatMinutes(milestones.firstManager)}`);
  world.products.forEach((product, index) => {
    console.log(`- Produit ${index + 1} (${product.name}) : ${formatMinutes(milestones.products[index])}`);
  });
  world.managers.forEach((manager, index) => {
    console.log(`- Manager ${index + 1} (${manager.name}) : ${formatMinutes(milestones.managers[index])}`);
  });
  console.log(`- Premier reset à 10 émissaires : ${formatMinutes(milestones.angels)}`);
}

const current = simulate(structuredClone(origworld) as World);
printResult('CHRONOLOGIE APRÈS AJUSTEMENT', current);

console.log(`
VALEURS APPLIQUÉES
- Conserver le produit 1 (cout 4, croissance 1.07, revenu 1, vitesse 500).
- Produit 2 : cout 50.
- Managers 2 à 6 : seuils 800, 8 000, 80 000, 800 000 et 8 000 000.
- Produits 3 à 6 : coûts de départ 600, 6 000, 60 000 et 600 000.
- Angel upgrades : seuils 10, 50, 250, 1 000 et 5 000.
`);

import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { World, Product, Palier, RatioType } from './graphql.js';
import { origworld } from './origworld.js';

const USERWORLDS_DIR = 'userworlds';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  // ---------------------------------------------------------------------
  // Lecture / sauvegarde du monde
  // ---------------------------------------------------------------------

  /**
   * Charge le monde de l'utilisateur, ou le monde d'origine s'il n'existe
   * pas encore. Fait aussi progresser la production depuis la dernière mise
   * à jour (calcul du temps hors-ligne).
   */
  readUserWorld(user: string): World {
    let world: World;
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), USERWORLDS_DIR, `${user}-world.json`),
      );
      world = JSON.parse(data.toString()) as World;
    } catch (e: unknown) {
      console.log((e as Error).message);
      world = structuredClone(origworld) as World;
    }

    this.updateWorld(world);
    return world;
  }

  saveWorld(user: string, world: World): void {
    fs.mkdirSync(path.join(process.cwd(), USERWORLDS_DIR), { recursive: true });
    fs.writeFile(
      path.join(process.cwd(), USERWORLDS_DIR, `${user}-world.json`),
      JSON.stringify(world),
      (err) => {
        if (err) {
          console.error(err);
          throw new Error(`Erreur d'écriture du monde côté serveur`);
        }
      },
    );
  }

  // ---------------------------------------------------------------------
  // Production
  // ---------------------------------------------------------------------

  private revenuUnitaire(world: World, product: Product): number {
    return (
      product.quantite *
      product.revenu *
      (1 + (world.activeangels * world.angelbonus) / 100)
    );
  }

  /**
   * Fait avancer la production de chaque produit en fonction du temps
   * écoulé depuis `world.lastupdate` (appelé au début de chaque query et
   * mutation, ce qui couvre aussi bien les actions du joueur que son temps
   * passé hors-ligne).
   */
  private updateWorld(world: World): void {
    const now = Date.now();
    const elapsed = world.lastupdate ? now - new Date(world.lastupdate).getTime() : 0;

    if (elapsed > 0) {
      for (const product of world.products) {
        if (product.quantite <= 0) continue;

        if (!product.managerUnlocked) {
          // Sans manager : une seule récolte, il faut que la production ait
          // été lancée (timeleft > 0) et que le délai soit écoulé.
          if (product.timeleft > 0) {
            if (elapsed >= product.timeleft) {
              const gain = this.revenuUnitaire(world, product);
              world.money += gain;
              world.score += gain;
              product.timeleft = 0;
            } else {
              product.timeleft -= elapsed;
            }
          }
        } else {
          // Avec manager : la production se relance automatiquement en
          // continu. On calcule combien de cycles complets de `vitesse` se
          // sont écoulés depuis la dernière récolte.
          const dejaEcoule = product.timeleft > 0 ? product.vitesse - product.timeleft : 0;
          const tempsTotal = dejaEcoule + elapsed;
          const cycles = Math.floor(tempsTotal / product.vitesse);

          if (cycles > 0) {
            const gain = this.revenuUnitaire(world, product) * cycles;
            world.money += gain;
            world.score += gain;
          }

          const reste = tempsTotal % product.vitesse;
          product.timeleft = product.vitesse - reste;
        }
      }
    }

    world.lastupdate = new Date(now).toISOString();
  }

  // ---------------------------------------------------------------------
  // Achat de produits
  // ---------------------------------------------------------------------

  /** Coût total pour acheter `quantite` unités supplémentaires d'un produit. */
  coutAchat(product: Product, quantite: number): number {
    if (product.croissance === 1) return product.cout * quantite;
    return (
      (product.cout * (Math.pow(product.croissance, quantite) - 1)) /
      (product.croissance - 1)
    );
  }

  // ---------------------------------------------------------------------
  // Paliers (unlocks, allunlocks, upgrades, angelupgrades)
  // ---------------------------------------------------------------------

  /**
   * Vérifie et débloque les paliers d'un produit ainsi que les paliers
   * globaux (allunlocks), à appeler après tout achat de produit.
   */
  checkUnlocks(world: World, product: Product): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
      }
    }

    for (const palier of world.allunlocks) {
      if (
        !palier.unlocked &&
        world.products.every((p) => p.quantite >= palier.seuil)
      ) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
      }
    }
  }

  /**
   * Applique le bonus d'un palier/upgrade/angelupgrade :
   * - typeratio "gain" : multiplie le revenu de la (ou des) cible(s)
   * - typeratio "vitesse" : divise le temps de production de la (ou des) cible(s)
   * - typeratio "ange" : renforce l'angelbonus du monde lui-même (idcible = -1)
   * idcible = 0 signifie une cible globale (tous les produits).
   */
  applyBonus(world: World, palier: Palier): void {
    if (palier.typeratio === RatioType.ange) {
      world.angelbonus *= palier.ratio;
      return;
    }

    const cibles =
      palier.idcible > 0
        ? world.products.filter((p) => p.id === palier.idcible)
        : world.products;

    for (const cible of cibles) {
      if (palier.typeratio === RatioType.gain) {
        cible.revenu *= palier.ratio;
      } else if (palier.typeratio === RatioType.vitesse) {
        cible.vitesse = Math.max(1, Math.round(cible.vitesse / palier.ratio));
      }
    }
  }

  // ---------------------------------------------------------------------
  // Reset du monde (prestige)
  // ---------------------------------------------------------------------

  /**
   * Nombre d'Émissaires de la Coalition gagnés à la remise à zéro, calculé
   * à partir des gains cumulés (world.score) selon la formule officielle
   * des consignes :
   *   nombre d'anges = 150 * sqrt(gains cumulés / 10^15) - totalangels
   * (le résultat représente les émissaires *supplémentaires* gagnés par
   * la partie en cours, totalangels étant déjà déduit).
   */
  calculerAngesGagnes(world: World): number {
    const total = 150 * Math.sqrt(world.score / 1e15);
    return Math.max(0, Math.floor(total - world.totalangels));
  }

  /** Reconstruit un monde neuf en conservant le score et les émissaires. */
  creerNouveauMonde(world: World, angesGagnes: number): World {
    const nouveauMonde = structuredClone(origworld) as World;
    nouveauMonde.score = world.score;
    nouveauMonde.totalangels = world.totalangels + angesGagnes;
    nouveauMonde.activeangels = world.activeangels + angesGagnes;
    nouveauMonde.lastupdate = new Date().toISOString();
    return nouveauMonde;
  }
}

import { Service, computed, inject, linkedSignal, signal } from '@angular/core';
import { Apollo } from '@apollo-orbit/angular';
import { form } from '@angular/forms/signals';
import {
  ACHETER_ANGEL_UPGRADE_MUTATION,
  ACHETER_CASH_UPGRADE_MUTATION,
  ACHETER_QT_PRODUIT_MUTATION,
  ENGAGER_MANAGER_MUTATION,
  GET_WORLD_QUERY,
  LANCER_PRODUCTION_PRODUIT_MUTATION,
  RESET_WORLD_MUTATION,
  PalierFieldsFragment,
  ProductFieldsFragment,
  RatioType,
  WorldFieldsFragment,
} from './graphql';

interface UserLogin {
  name: string;
}

function initialUsername(): string {
  const stored = localStorage.getItem('username');
  if (stored && stored !== '') return stored;
  // Bonus : si aucun pseudo n'est stocké, on en génère un plutôt que de laisser le champ vide.
  return 'Captain' + Math.floor(Math.random() * 10000);
}

/**
 * Coeur de la logique du jeu, partagé entre app et produit :
 * - récupération/synchronisation du monde via GraphQL
 * - achats (produits, managers, upgrades, angel upgrades)
 * - application des bonus de paliers/upgrades
 * - gestion du joueur (pseudo persistant en local, reset de partie)
 *
 * Les formules ci-dessous (coût d'achat, bonus d'ange, application des
 * paliers) sont volontairement identiques à celles du backend
 * (backend/src/app.service.ts) afin que client et serveur restent
 * cohérents l'un avec l'autre.
 */
@Service()
export class GameService {
  private readonly apollo = inject(Apollo);

  readonly user = signal(initialUsername());
  readonly server = signal('http://localhost:3000');

  /**
   * Construit l'URL absolue d'une image servie par le backend
   * (ex: "icones/gda.jpg" -> "http://localhost:3000/icones/gda.jpg").
   * Les chemins stockés côté serveur n'ont pas de "/" en tête, il faut
   * donc l'ajouter explicitement entre `server()` et le chemin.
   */
  logoUrl(logo: string): string {
    return `${this.server()}/${logo}`;
  }

  readonly worldQuery = this.apollo.signal.query({
    query: GET_WORLD_QUERY,
    variables: () => ({ user: this.user() }),
  });

  /** Copie locale, modifiable de façon optimiste, du monde renvoyé par le serveur. */
  readonly world = linkedSignal(() => this.worldQuery.data()?.getWorld);

  /** Dernier message à afficher au joueur sous forme de toast. */
  readonly snackmessage = signal('');

  // -----------------------------------------------------------------------
  // Identité du joueur
  // -----------------------------------------------------------------------

  readonly userLoginModel = signal<UserLogin>({ name: this.user() });
  readonly loginForm = form(this.userLoginModel);

  commitName(): void {
    const field = this.loginForm.name().value();
    if (!field) return;
    localStorage.setItem('username', field);
    this.user.set(field);
  }

  refreshWorld(): void {
    void this.worldQuery.refetch();
  }

  // -----------------------------------------------------------------------
  // Formules partagées avec le backend
  // -----------------------------------------------------------------------

  /** Coût total pour acheter `quantite` unités supplémentaires d'un produit. */
  coutAchat(product: Pick<ProductFieldsFragment, 'cout' | 'croissance'>, quantite: number): number {
    if (quantite <= 0) return 0;
    if (product.croissance === 1) return product.cout * quantite;
    return (product.cout * (Math.pow(product.croissance, quantite) - 1)) / (product.croissance - 1);
  }

  /** Quantité maximale achetable d'un produit avec la somme `money`. */
  maxAffordable(product: Pick<ProductFieldsFragment, 'cout' | 'croissance'>, money: number): number {
    if (money <= 0 || product.cout <= 0) return 0;
    if (product.croissance === 1) return Math.floor(money / product.cout);
    const n = Math.floor(
      Math.log((money * (product.croissance - 1)) / product.cout + 1) / Math.log(product.croissance),
    );
    return Math.max(0, n);
  }

  /** Nombre d'émissaires supplémentaires gagnés si la partie était remise à zéro maintenant. */
  readonly angesGagnes = computed(() => {
    const world = this.world();
    if (!world) return 0;
    const total = 150 * Math.sqrt(world.score / 1e15);
    return Math.max(0, Math.floor(total - world.totalangels));
  });

  // -----------------------------------------------------------------------
  // Badges (bouton mis en valeur quand une action est possible)
  // -----------------------------------------------------------------------

  readonly badgeManagers = computed(() => {
    const world = this.world();
    if (!world) return 0;
    return world.managers.filter((m) => !m.unlocked && world.money >= m.seuil).length;
  });

  readonly badgeUpgrades = computed(() => {
    const world = this.world();
    if (!world) return 0;
    return world.upgrades.filter((u) => !u.unlocked && world.money >= u.seuil).length;
  });

  readonly badgeAngelUpgrades = computed(() => {
    const world = this.world();
    if (!world) return 0;
    return world.angelupgrades.filter((u) => !u.unlocked && world.activeangels >= u.seuil).length;
  });

  // -----------------------------------------------------------------------
  // Production
  // -----------------------------------------------------------------------

  /** Appelé par `produit` à chaque fois qu'un cycle de production s'est terminé. */
  productionDone(prod: ProductFieldsFragment, qt: number): void {
    if (qt <= 0) return;
    this.world.update((world) => {
      if (!world) return world;
      const bonus = 1 + (world.activeangels * world.angelbonus) / 100;
      const gain = prod.revenu * prod.quantite * qt * bonus;
      return { ...world, money: world.money + gain, score: world.score + gain };
    });
  }

  async lancerProductionGraphQL(id: number): Promise<void> {
    try {
      await this.lancerProductionMutation.mutate({ variables: { user: this.user(), id } });
    } catch {
      this.snackmessage.set('Erreur de transmission serveur pour le lancement de production');
    }
  }

  // -----------------------------------------------------------------------
  // Achat de produits
  // -----------------------------------------------------------------------

  buyProduct(qt: number, product: ProductFieldsFragment): void {
    const world = this.world();
    if (!world || qt <= 0) return;

    const cost = this.coutAchat(product, qt);
    if (world.money < cost) return;

    const newWorld = structuredClone(world);
    const newProduct = newWorld.products.find((p) => p.id === product.id);
    if (!newProduct) return;

    newProduct.quantite += qt;
    newProduct.cout = newProduct.cout * Math.pow(newProduct.croissance, qt);
    newWorld.money -= cost;

    this.applyUnlocks(newWorld, newProduct);
    this.world.set(newWorld);
    void this.acheterProduitsGraphQL(product.id, qt);
  }

  private async acheterProduitsGraphQL(id: number, qt: number): Promise<void> {
    try {
      await this.acheterProduitsMutation.mutate({ variables: { user: this.user(), id, quantite: qt } });
    } catch {
      this.snackmessage.set("Erreur de transmission serveur pour l'achat du produit");
    }
  }

  // -----------------------------------------------------------------------
  // Paliers (unlocks / allunlocks) et bonus
  // -----------------------------------------------------------------------

  /** Débloque les paliers (spécifiques au produit puis globaux) qui viennent d'être atteints. */
  private applyUnlocks(world: WorldFieldsFragment, product: ProductFieldsFragment): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
        this.snackmessage.set(`Palier débloqué : ${palier.name}`);
      }
    }

    for (const palier of world.allunlocks) {
      if (!palier.unlocked && world.products.every((p) => p.quantite >= palier.seuil)) {
        palier.unlocked = true;
        this.applyBonus(world, palier);
        this.snackmessage.set(`Bonus mondial débloqué : ${palier.name}`);
      }
    }
  }

  /**
   * Applique le bonus d'un palier/upgrade/angelupgrade :
   * - "gain" : multiplie le revenu de la (ou des) cible(s)
   * - "vitesse" : divise le temps de production de la (ou des) cible(s)
   * - "ange" : renforce l'angelbonus du monde
   * idcible = 0 signifie une cible globale (tous les produits).
   */
  private applyBonus(world: WorldFieldsFragment, palier: PalierFieldsFragment): void {
    if (palier.typeratio === RatioType.Ange) {
      world.angelbonus *= palier.ratio;
      return;
    }

    const cibles = palier.idcible > 0 ? world.products.filter((p) => p.id === palier.idcible) : world.products;
    for (const cible of cibles) {
      if (palier.typeratio === RatioType.Gain) {
        cible.revenu *= palier.ratio;
      } else if (palier.typeratio === RatioType.Vitesse) {
        cible.vitesse = Math.max(1, Math.round(cible.vitesse / palier.ratio));
      }
    }
  }

  // -----------------------------------------------------------------------
  // Managers
  // -----------------------------------------------------------------------

  hireManager(manager: PalierFieldsFragment): void {
    const world = this.world();
    if (!world || manager.unlocked || world.money < manager.seuil) return;

    const newWorld = structuredClone(world);
    const newManager = newWorld.managers.find((m) => m.name === manager.name);
    const targetProduct = newWorld.products.find((p) => p.id === manager.idcible);
    if (!newManager || !targetProduct) return;

    newWorld.money -= manager.seuil;
    newManager.unlocked = true;
    targetProduct.managerUnlocked = true;

    this.world.set(newWorld);
    this.snackmessage.set(`${manager.name} a rejoint votre équipe !`);
    void this.engagerManagerGraphQL(manager.name);
  }

  private async engagerManagerGraphQL(name: string): Promise<void> {
    try {
      await this.engagerManagerMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur de transmission serveur pour l'engagement du manager");
    }
  }

  // -----------------------------------------------------------------------
  // Cash upgrades
  // -----------------------------------------------------------------------

  buyCashUpgrade(upgrade: PalierFieldsFragment): void {
    const world = this.world();
    if (!world || upgrade.unlocked || world.money < upgrade.seuil) return;

    const newWorld = structuredClone(world);
    const newUpgrade = newWorld.upgrades.find((u) => u.name === upgrade.name);
    if (!newUpgrade) return;

    newWorld.money -= upgrade.seuil;
    newUpgrade.unlocked = true;
    this.applyBonus(newWorld, newUpgrade);

    this.world.set(newWorld);
    this.snackmessage.set(`Amélioration acquise : ${upgrade.name}`);
    void this.acheterCashUpgradeGraphQL(upgrade.name);
  }

  private async acheterCashUpgradeGraphQL(name: string): Promise<void> {
    try {
      await this.acheterCashUpgradeMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur de transmission serveur pour l'achat de l'amélioration");
    }
  }

  // -----------------------------------------------------------------------
  // Anges et Angel upgrades
  // -----------------------------------------------------------------------

  buyAngelUpgrade(upgrade: PalierFieldsFragment): void {
    const world = this.world();
    if (!world || upgrade.unlocked || world.activeangels < upgrade.seuil) return;

    const newWorld = structuredClone(world);
    const newUpgrade = newWorld.angelupgrades.find((u) => u.name === upgrade.name);
    if (!newUpgrade) return;

    newWorld.activeangels -= upgrade.seuil;
    newUpgrade.unlocked = true;
    this.applyBonus(newWorld, newUpgrade);

    this.world.set(newWorld);
    this.snackmessage.set(`Bonus céleste débloqué : ${upgrade.name}`);
    void this.acheterAngelUpgradeGraphQL(upgrade.name);
  }

  private async acheterAngelUpgradeGraphQL(name: string): Promise<void> {
    try {
      await this.acheterAngelUpgradeMutation.mutate({ variables: { user: this.user(), name } });
    } catch {
      this.snackmessage.set("Erreur de transmission serveur pour l'achat du bonus céleste");
    }
  }

  async resetWorldGraphQL(): Promise<void> {
    try {
      await this.resetWorldMutation.mutate({ variables: { user: this.user() } });
      this.snackmessage.set('Nouvelle partie lancée, vos émissaires sont à vos côtés !');
    } catch {
      this.snackmessage.set('Erreur de transmission serveur pour la remise à zéro');
    } finally {
      this.refreshWorld();
    }
  }

  // -----------------------------------------------------------------------
  // Mutations GraphQL
  // -----------------------------------------------------------------------

  readonly acheterProduitsMutation = this.apollo.signal.mutation(ACHETER_QT_PRODUIT_MUTATION);
  readonly lancerProductionMutation = this.apollo.signal.mutation(LANCER_PRODUCTION_PRODUIT_MUTATION);
  readonly engagerManagerMutation = this.apollo.signal.mutation(ENGAGER_MANAGER_MUTATION);
  readonly acheterCashUpgradeMutation = this.apollo.signal.mutation(ACHETER_CASH_UPGRADE_MUTATION);
  readonly acheterAngelUpgradeMutation = this.apollo.signal.mutation(ACHETER_ANGEL_UPGRADE_MUTATION);
  readonly resetWorldMutation = this.apollo.signal.mutation(RESET_WORLD_MUTATION);
}

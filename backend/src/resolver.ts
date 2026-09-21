import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  @Query()
  async getWorld(@Args('user') user: string) {
    const world = this.service.readUserWorld(user);
    this.service.saveWorld(user, world);
    return world;
  }

  @Mutation()
  async acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ) {
    const world = this.service.readUserWorld(user);
    const product = world.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }

    const cout = this.service.coutAchat(product, quantite);
    if (world.money < cout) {
      throw new Error(
        `Fonds GDA insuffisants pour acheter ${quantite} unité(s) de ${product.name}`,
      );
    }

    world.money -= cout;
    product.quantite += quantite;
    product.cout = product.cout * Math.pow(product.croissance, quantite);

    this.service.checkUnlocks(world, product);

    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  async lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ) {
    const world = this.service.readUserWorld(user);
    const product = world.products.find((p) => p.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }
    if (product.quantite <= 0) {
      throw new Error(`Aucune unité de ${product.name} à faire produire`);
    }

    product.timeleft = product.vitesse;

    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  async engagerManager(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    const manager = world.managers.find((m) => m.name === name);
    if (!manager) {
      throw new Error(`Le manager "${name}" n'existe pas`);
    }
    if (manager.unlocked) {
      throw new Error(`Le manager "${name}" est déjà engagé`);
    }
    if (world.money < manager.seuil) {
      throw new Error(`Fonds GDA insuffisants pour engager ${name}`);
    }

    const product = world.products.find((p) => p.id === manager.idcible);
    if (!product) {
      throw new Error(`Produit cible du manager "${name}" introuvable`);
    }

    world.money -= manager.seuil;
    manager.unlocked = true;
    product.managerUnlocked = true;

    this.service.saveWorld(user, world);
    return manager;
  }

  @Mutation()
  async acheterCashUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    const upgrade = world.upgrades.find((u) => u.name === name);
    if (!upgrade) {
      throw new Error(`L'upgrade "${name}" n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'upgrade "${name}" est déjà acquis`);
    }
    if (world.money < upgrade.seuil) {
      throw new Error(`Fonds GDA insuffisants pour acquérir "${name}"`);
    }

    world.money -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyBonus(world, upgrade);

    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  async acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    const upgrade = world.angelupgrades.find((u) => u.name === name);
    if (!upgrade) {
      throw new Error(`L'angelupgrade "${name}" n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'angelupgrade "${name}" est déjà acquis`);
    }
    if (world.activeangels < upgrade.seuil) {
      throw new Error(
        `Émissaires de la Coalition insuffisants pour acquérir "${name}"`,
      );
    }

    world.activeangels -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyBonus(world, upgrade);

    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  async resetWorld(@Args('user') user: string) {
    const world = this.service.readUserWorld(user);

    const angesGagnes = this.service.calculerAngesGagnes(world);
    const nouveauMonde = this.service.creerNouveauMonde(world, angesGagnes);

    this.service.saveWorld(user, nouveauMonde);
    return nouveauMonde;
  }
}

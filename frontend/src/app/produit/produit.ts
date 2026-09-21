import { Component, OnDestroy, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameService } from '../game';
import { BigvaluePipe } from '../bigvalue-pipe';
import { SecondPipe } from '../second-pipe';
import { ProductFieldsFragment } from '../graphql';

export type QtMulti = 'x1' | 'x10' | 'x100' | 'Max';

/**
 * Affichage et logique d'un produit : icône + quantité, barre de
 * production, achat. La boucle de production (calcScore, appelée toutes
 * les 100ms) reproduit exactement la logique du backend
 * (backend/src/app.service.ts#updateWorld) afin que client et serveur
 * restent synchronisés.
 */
@Component({
  imports: [BigvaluePipe, SecondPipe],
  selector: 'app-produit',
  styleUrl: './produit.css',
  templateUrl: './produit.html',
})
export class Produit implements OnInit, OnDestroy {
  protected readonly gameService = inject(GameService);
  private readonly snackBar = inject(MatSnackBar);

  readonly prod = input<ProductFieldsFragment | undefined>();
  readonly qtmulti = input<QtMulti>('x1');

  /** Progression de la barre en cours (0 à 100). */
  protected readonly progress = signal(0);
  /** Temps restant (ms) avant la fin du cycle de production en cours. */
  protected readonly timeleft = signal(0);

  private lastTickTime = performance.now();
  private intervalId?: ReturnType<typeof setInterval>;
  private rafId?: number;
  private destroyed = false;

  constructor() {
    // Toast d'erreur si une mutation d'achat/production échoue côté serveur.
    effect(() => {
      if (this.gameService.acheterProduitsMutation.error()) {
        this.snackBar.open("Erreur de transmission serveur pour l'achat du produit", 'ok', { duration: 2000 });
      }
    });
  }

  ngOnInit(): void {
    this.lastTickTime = performance.now();
    this.intervalId = setInterval(() => this.calcScore(), 100);
    this.rafId = requestAnimationFrame(this.animate);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  // -----------------------------------------------------------------------
  // Achat
  // -----------------------------------------------------------------------

  /** Quantité supplémentaire maximale achetable avec l'argent actuel du monde. */
  protected readonly maxCanBuy = computed(() => {
    const prod = this.prod();
    const world = this.gameService.world();
    if (!prod || !world) return 0;
    return this.gameService.maxAffordable(prod, world.money);
  });

  /** Quantité que l'on va effectivement essayer d'acheter selon le commutateur x1/x10/x100/Max. */
  protected readonly numberToBuy = computed(() => {
    switch (this.qtmulti()) {
      case 'x1':
        return 1;
      case 'x10':
        return 10;
      case 'x100':
        return 100;
      case 'Max':
        return this.maxCanBuy();
    }
  });

  protected readonly buyCost = computed(() => {
    const prod = this.prod();
    const n = this.numberToBuy();
    if (!prod || n <= 0) return 0;
    return this.gameService.coutAchat(prod, n);
  });

  protected readonly canBuy = computed(() => {
    const world = this.gameService.world();
    const n = this.numberToBuy();
    return !!world && n > 0 && world.money >= this.buyCost();
  });

  protected buyProduct(): void {
    const prod = this.prod();
    const n = this.numberToBuy();
    if (!prod || !this.canBuy()) return;
    this.gameService.buyProduct(n, prod);
  }

  // -----------------------------------------------------------------------
  // Production
  // -----------------------------------------------------------------------

  protected startFabrication(): void {
    const prod = this.prod();
    if (!prod || prod.quantite <= 0 || prod.managerUnlocked || this.timeleft() > 0) return;

    this.timeleft.set(prod.vitesse);
    this.lastTickTime = performance.now();
    void this.gameService.lancerProductionGraphQL(prod.id);
  }

  /**
   * Boucle principale de calcul du score, appelée toutes les 100ms. Reprend
   * exactement la logique du backend :
   * - sans manager : une seule récolte quand le temps restant est écoulé
   * - avec manager : production continue, calcul du nombre de cycles
   *   complets écoulés depuis la dernière mise à jour
   */
  private calcScore(): void {
    const prod = this.prod();
    const now = performance.now();
    const elapsed = now - this.lastTickTime;
    this.lastTickTime = now;

    if (!prod || prod.quantite <= 0) return;

    if (!prod.managerUnlocked) {
      const left = this.timeleft();
      if (left <= 0) return;
      if (elapsed >= left) {
        this.timeleft.set(0);
        this.gameService.productionDone(prod, 1);
      } else {
        this.timeleft.set(left - elapsed);
      }
    } else {
      const dejaEcoule = this.timeleft() > 0 ? prod.vitesse - this.timeleft() : 0;
      const tempsTotal = dejaEcoule + elapsed;
      const cycles = Math.floor(tempsTotal / prod.vitesse);
      const reste = tempsTotal % prod.vitesse;
      this.timeleft.set(prod.vitesse - reste);
      if (cycles > 0) {
        this.gameService.productionDone(prod, cycles);
      }
    }
  }

  /** Anime la barre de progression à 60fps en interpolant entre deux ticks de calcScore(). */
  private animate = (): void => {
    if (this.destroyed) return;

    const prod = this.prod();
    const active = !!prod && prod.quantite > 0 && (prod.managerUnlocked || this.timeleft() > 0);

    if (active && prod) {
      const sinceTick = performance.now() - this.lastTickTime;
      const effectiveRemaining = Math.max(0, this.timeleft() - sinceTick);
      const pct = ((prod.vitesse - effectiveRemaining) / prod.vitesse) * 100;
      this.progress.set(Math.min(100, Math.max(0, pct)));
    } else {
      this.progress.set(0);
    }

    this.rafId = requestAnimationFrame(this.animate);
  };
}

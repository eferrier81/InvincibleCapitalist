import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormField } from '@angular/forms/signals';
import { GameService } from './game';
import { Produit, QtMulti } from './produit/produit';
import { BigvaluePipe } from './bigvalue-pipe';
import { PalierFieldsFragment } from './graphql';

type Modal = 'managers' | 'unlocks' | 'upgrades' | 'angels' | 'angelUpgrades';

@Component({
  imports: [
    Produit,
    BigvaluePipe,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatSnackBarModule,
    FormField,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly gameService = inject(GameService);
  private readonly snackBar = inject(MatSnackBar);

  /** Copie du signal du service, pour plus de facilité dans le template. */
  protected readonly world = this.gameService.world;

  protected readonly qtmulti = signal<QtMulti>('x1');

  protected readonly openModal = signal<Modal | null>(null);

  constructor() {
    // Affiche un toast à chaque nouveau message du GameService (achat,
    // palier débloqué, erreur réseau...).
    effect(() => {
      const message = this.gameService.snackmessage();
      if (message) {
        this.snackBar.open(message, 'ok', {
          duration: 2000,
          panelClass: ['comic-snackbar'],
        });
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected closeModal(): void {
    this.openModal.set(null);
  }

  protected toggleModal(modal: Modal): void {
    this.openModal.update((current) => (current === modal ? null : modal));
  }

  /** Cycle x1 -> x10 -> x100 -> Next -> Max -> x1. */
  protected cycleQtMulti(): void {
    this.qtmulti.update((current) => {
      switch (current) {
        case 'x1':
          return 'x10';
        case 'x10':
          return 'x100';
        case 'x100':
          return 'Next';
        case 'Next':
          return 'Max';
        case 'Max':
        default:
          return 'x1';
      }
    });
  }

  protected targetProductName(idcible: number): string {
    return this.world()?.products.find((p) => p.id === idcible)?.name ?? '?';
  }

  /** Pour chaque produit, le prochain palier non débloqué (le plus proche). */
  protected readonly nextProductUnlocks = computed(() => {
    const world = this.world();
    if (!world) return [] as { productName: string; palier: PalierFieldsFragment }[];

    const result: { productName: string; palier: PalierFieldsFragment }[] = [];
    for (const product of world.products) {
      const next = [...product.paliers].filter((p) => !p.unlocked).sort((a, b) => a.seuil - b.seuil)[0];
      if (next) result.push({ productName: product.name, palier: next });
    }
    return result;
  });

  protected readonly nextGlobalUnlock = computed<PalierFieldsFragment | null>(() => {
    const allUnlocks = this.world()?.allunlocks ?? [];
    return [...allUnlocks].filter((palier) => !palier.unlocked).sort((a, b) => a.seuil - b.seuil)[0] ?? null;
  });

  protected readonly allUnlocksComplete = computed(() => {
    return !!this.world() && this.nextProductUnlocks().length === 0 && !this.nextGlobalUnlock();
  });

  protected readonly availableCashUpgrades = computed(() => {
    return [...(this.world()?.upgrades ?? [])]
      .filter((upgrade) => !upgrade.unlocked)
      .sort((a, b) => a.seuil - b.seuil)
      .slice(0, 4);
  });

  protected readonly remainingCashUpgrades = computed(() => {
    return Math.max(0, (this.world()?.upgrades ?? []).filter((upgrade) => !upgrade.unlocked).length - 4);
  });

  protected readonly availableAngelUpgrades = computed(() => {
    return [...(this.world()?.angelupgrades ?? [])]
      .filter((upgrade) => !upgrade.unlocked)
      .sort((a, b) => a.seuil - b.seuil)
      .slice(0, 4);
  });

  protected readonly remainingAngelUpgrades = computed(() => {
    return Math.max(0, (this.world()?.angelupgrades ?? []).filter((upgrade) => !upgrade.unlocked).length - 4);
  });

  protected resetWorld(): void {
    void this.gameService.resetWorldGraphQL();
    this.closeModal();
  }
}

import { Component, inject, signal } from '@angular/core';
import { Apollo } from '@apollo-orbit/angular';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GET_WORLD_QUERY } from './graphql';

@Component({
  imports: [MatToolbarModule, MatCardModule, MatProgressSpinnerModule],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('ISIS Capitalist');
  private readonly apollo = inject(Apollo);

  protected readonly user = signal('enzo');

  // Smoke-test query: proves the Apollo client / codegen / schema wiring is
  // correct end-to-end. The real GameService will replace this.
  protected readonly worldQuery = this.apollo.signal.query({
    query: GET_WORLD_QUERY,
    variables: () => ({ user: this.user() }),
  });
}

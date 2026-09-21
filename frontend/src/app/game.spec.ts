import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { GameService } from './game';
import { provideGraphQL } from './graphql/graphql.provider';

describe('GameService', () => {
  let service: GameService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideGraphQL()],
    });
    service = TestBed.inject(GameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('computes the geometric purchase cost like the backend', () => {
    const product = { cout: 10, croissance: 1.1 };
    // cost(3) = cout * (c^3 - 1) / (c - 1)
    const expected = (10 * (Math.pow(1.1, 3) - 1)) / (1.1 - 1);
    expect(service.coutAchat(product, 3)).toBeCloseTo(expected);
  });

  it('maxAffordable is the inverse of coutAchat', () => {
    const product = { cout: 10, croissance: 1.1 };
    const n = service.maxAffordable(product, 500);
    const costForN = service.coutAchat(product, n);
    const costForNPlus1 = service.coutAchat(product, n + 1);
    expect(costForN).toBeLessThanOrEqual(500);
    expect(costForNPlus1).toBeGreaterThan(500);
  });
});

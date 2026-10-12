import { SERVER_URL, enregistrerAdresseServeur, normaliserAdresseServeur, serverUrl } from './config';

describe('config : adresse du serveur', () => {
  afterEach(() => {
    enregistrerAdresseServeur(SERVER_URL);
    localStorage.removeItem('invincible-capitalist.server');
  });

  it('ajoute http:// et retire le slash final', () => {
    expect(normaliserAdresseServeur(' 192.168.1.20:3000/ ')).toBe('http://192.168.1.20:3000');
    expect(normaliserAdresseServeur('https://exemple.fr//')).toBe('https://exemple.fr');
  });

  it("accepte l'adresse de l'endpoint GraphQL d'un autre groupe", () => {
    expect(normaliserAdresseServeur('http://capitalist.exemple.fr/graphql')).toBe('http://capitalist.exemple.fr');
    expect(normaliserAdresseServeur('localhost:3000/graphql/')).toBe('http://localhost:3000');
  });

  it("revient à l'adresse par défaut si la saisie est vide", () => {
    expect(normaliserAdresseServeur('   ')).toBe(SERVER_URL);
  });

  it("mémorise l'adresse choisie dans le navigateur", () => {
    enregistrerAdresseServeur('http://10.0.0.5:3000');
    expect(serverUrl()).toBe('http://10.0.0.5:3000');
    expect(localStorage.getItem('invincible-capitalist.server')).toBe('http://10.0.0.5:3000');
  });
});

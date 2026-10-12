import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { InMemoryCache, provideApollo, withApolloOptions } from '@apollo-orbit/angular';
import { HttpLinkFactory, withHttpLink } from '@apollo-orbit/angular/http';
import { serverUrl } from '../config';

export function provideGraphQL(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideApollo(
      withApolloOptions(() => {
        const httpLinkFactory = inject(HttpLinkFactory);
        // L'adresse est relue à chaque requête : changer de serveur depuis l'interface
        // ne demande pas de recharger la page.
        const httpLink = httpLinkFactory.create({ uri: () => `${serverUrl()}/graphql` });
        return {
          // Product n'est pas normalisé (keyFields: false) : sinon chaque réponse de
          // mutation renvoyant un Product (achat, lancement de production) serait
          // fusionnée dans le GetWorld en cache, ce qui ferait réémettre la query et
          // écraserait le monde local (argent compris) par sa version en cache,
          // périmée depuis le dernier GetWorld.
          cache: new InMemoryCache({ typePolicies: { Product: { keyFields: false } } }),
          link: httpLink,
        };
      }),
      withHttpLink(),
    ),
  ]);
}

# InvincibleCapitalist

Recréation du jeu de gestion incrémentale **AdVentureCapitalist** dans l'univers de la série **Invincible**, avec un backend **GraphQL (NestJS)** et un frontend **Angular**.

Projet du module *Architectures orientées service* (ISIS, FIE5, S9).

## Auteurs

- Enzo FERRIER
- Ethan CABANES

## Le jeu

Le joueur dirige la Global Defense Agency (GDA) de Cecil Stedman et fait fructifier six activités, des patrouilles de quartier d'Invincible jusqu'au programme de veille viltrumite.

- **Production** : un clic sur l'image d'un produit lance un cycle ; la barre de progression se remplit selon la vitesse du produit et le gain est crédité à la fin du cycle.
- **Achat** : le bouton d'achat suit le multiplicateur de l'en-tête (x1 → x10 → x100 → Max → Next). *Max* achète le plus possible avec l'argent disponible, *Next* juste ce qu'il faut pour atteindre le prochain palier. Le coût augmente de 7 % à chaque exemplaire.
- **Managers** : un manager engagé relance la production de son produit automatiquement, même quand le joueur ne joue pas (le temps passé hors ligne est rattrapé au retour).
- **Paliers (Unlocks)** : posséder assez d'exemplaires d'un produit débloque des bonus de vitesse ou de gain ; les paliers globaux exigent que tous les produits atteignent le seuil.
- **Cash Upgrades** : améliorations achetées avec l'argent, qui multiplient la vitesse ou le gain d'un produit.
- **Investors et émissaires (anges)** : un reset remet la partie à zéro mais rapporte des émissaires selon la formule officielle `150 × √(score cumulé / 10^15) − émissaires déjà gagnés`. Chaque émissaire actif augmente les gains de 2 %.
- **Angel Upgrades** : bonus permanents achetés en dépensant des émissaires.
- **Pseudo** : chaque joueur a sa propre partie ; le pseudo est mémorisé dans le navigateur.

## Architecture

```
┌────────────────────────────┐         GraphQL (HTTP POST /graphql)        ┌──────────────────────────────┐
│ Frontend Angular           │ ──────────────────────────────────────────▶ │ Backend NestJS               │
│ localhost:4200             │   getWorld, acheterQtProduit,               │ localhost:3000               │
│ - signals + Apollo Client  │   lancerProductionProduit, engagerManager,  │ - schéma GraphQL schema-first│
│ - logique de jeu locale    │   acheterCashUpgrade, acheterAngelUpgrade,  │ - logique métier (service)   │
│   (GameService)            │   resetWorld                                │ - images sur /icones         │
└────────────────────────────┘ ◀────────────── images (GET /icones/…) ──── └──────────────┬───────────────┘
                                                                                          │ une sauvegarde JSON
                                                                                          ▼ par joueur
                                                                           backend/userworlds/<pseudo>-world.json
```

- Le **backend** (`backend/`) expose le schéma `src/schema.graphql`, implémenté par `src/resolver.ts` et `src/app.service.ts`. Le monde de départ est défini dans `src/origworld.ts`. À chaque requête, le serveur fait avancer la production depuis la dernière mise à jour, ce qui gère le temps passé hors ligne.
- Le **frontend** (`frontend/`) affiche le monde et applique immédiatement chaque action en local (avec les mêmes formules que le serveur) avant de l'envoyer au backend, pour que le jeu reste fluide. Les types TypeScript des requêtes sont générés à partir du schéma (`npm run codegen`).

## Prérequis

- **Node.js 22.22.3 ou plus récent** (exigé par Angular).
- npm.
- Si le projet est dans un dossier synchronisé (OneDrive, etc.), mettre la synchronisation en pause pendant les `npm install` : elle peut corrompre `node_modules`.

## Installation et lancement

Les deux serveurs doivent tourner en même temps, dans deux terminaux.

**Backend**

```bash
cd backend
npm install
npm run start:dev
```

L'API GraphQL (et son playground) est sur http://localhost:3000/graphql, les images sur http://localhost:3000/icones/.

**Frontend**

```bash
cd frontend
npm install
npm run codegen
npm start
```

Le jeu est sur http://localhost:4200.

`npm run codegen` régénère les types à partir de `frontend/src/app/graphql/schema.graphql`. Ce fichier est une copie de `backend/src/schema.graphql` : les deux doivent rester identiques, et le codegen doit être relancé après toute modification du schéma ou de `queries.graphql`.

Les parties sont sauvegardées dans `backend/userworlds/` (non versionné). Pour repartir de zéro, supprimer le fichier du joueur ou faire un reset depuis la fenêtre Investors.

## Tests

```bash
cd backend
npm test            # règles du jeu, résolveurs, images du monde
npm run test:e2e    # démarrage complet de l'application

cd frontend
npm test            # composants, règles du jeu côté client, configuration du serveur
```

## Test d'interopérabilité

Tous les groupes implémentent le même schéma GraphQL : notre frontend peut jouer sur le backend d'un autre groupe, et inversement.

**Se brancher sur le backend d'un autre groupe** : dans le jeu, saisir l'adresse de leur serveur dans le champ **Serveur** en bas du menu, puis valider. Les formats `192.168.1.20:3000`, `http://192.168.1.20:3000` et `http://192.168.1.20:3000/graphql` sont acceptés. L'adresse est mémorisée dans le navigateur ; saisir `localhost:3000` pour revenir à notre backend.

**Ouvrir notre backend aux autres** : `npm run start:dev` écoute sur toutes les interfaces réseau et affiche au démarrage l'adresse à communiquer (`Depuis une autre machine du réseau : http://<ip>:3000/graphql`). Les deux machines doivent être sur le même réseau, et le pare-feu Windows doit autoriser Node.js sur les réseaux privés (accepter la fenêtre qui s'ouvre au premier lancement).

**Ouvrir notre frontend aux autres** : `npm run start:reseau` dans `frontend/` rend le jeu accessible sur `http://<ip>:4200`.

À vérifier pendant le test : chargement du monde, images, lancement de production, achat, engagement d'un manager, upgrades et reset.

## Équilibrage

Les valeurs de l'économie (coûts, revenus, vitesses, seuils) sont dans `backend/src/origworld.ts`. Deux simulations aident à les régler :

```bash
cd backend
npx tsx scripts/simuler-economie.ts                  # joueur passif
python scripts/simuler-joueur.py src/origworld.ts 2  # joueur qui réinvestit, sur 2 h
```

Avec les valeurs actuelles, un joueur qui réinvestit possède les six produits en moins de 10 minutes et peut faire un premier reset rentable au bout de 20 à 30 minutes.

## Structure du projet

```
InvincibleCapitalist/
├── backend/
│   ├── public/icones/      # images du jeu, une par élément
│   ├── scripts/            # simulations d'équilibrage
│   ├── src/                # schéma GraphQL, résolveurs, logique métier, monde initial
│   └── test/               # test de bout en bout
├── frontend/
│   └── src/app/            # composants app et produit, GameService, client GraphQL
└── docs/                   # dossier de conception
```

## Documentation

Voir [`docs/Dossier conception.docx`](./docs/Dossier%20conception.docx) pour le dossier de conception (univers, boucle de jeu, contenu thématique, économie).

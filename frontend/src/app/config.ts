import { signal } from '@angular/core';

/** Adresse du backend utilisée par défaut (sans slash final). */
export const SERVER_URL = 'http://localhost:3000';

// Clé préfixée : une autre appli servie sur le même localhost:4200 (TP, projet
// d'un autre groupe) peut avoir déjà enregistré sa propre clé « server ».
const CLE_STOCKAGE = 'invincible-capitalist.server';

/**
 * Normalise une adresse saisie par le joueur : espaces retirés, « http:// »
 * ajouté si aucun protocole n'est précisé, « /graphql » et slash final retirés
 * (un autre groupe donnera souvent directement l'adresse de son endpoint GraphQL).
 * Une saisie vide revient à l'adresse par défaut.
 */
export function normaliserAdresseServeur(saisie: string): string {
  let adresse = saisie.trim();
  if (!adresse) return SERVER_URL;
  if (!/^https?:\/\//i.test(adresse)) adresse = `http://${adresse}`;
  return adresse.replace(/\/+$/, '').replace(/\/graphql$/i, '').replace(/\/+$/, '');
}

function adresseInitiale(): string {
  try {
    const stockee = localStorage.getItem(CLE_STOCKAGE);
    if (stockee) return normaliserAdresseServeur(stockee);
  } catch {
    // localStorage indisponible (navigation privée, tests) : adresse par défaut.
  }
  return SERVER_URL;
}

/**
 * Adresse du backend en cours d'utilisation. Elle se change depuis le champ
 * « Serveur » de l'interface (test d'interopérabilité avec un autre groupe),
 * est mémorisée dans le navigateur, et elle est relue à chaque requête
 * GraphQL et pour chaque image.
 */
export const serverUrl = signal(adresseInitiale());

export function enregistrerAdresseServeur(adresse: string): void {
  serverUrl.set(adresse);
  try {
    localStorage.setItem(CLE_STOCKAGE, adresse);
  } catch {
    // Pas de persistance possible : l'adresse reste valable jusqu'au rechargement.
  }
}

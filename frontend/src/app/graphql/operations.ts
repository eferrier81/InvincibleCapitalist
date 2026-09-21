/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type * as Types from './types';

import { gql } from '@apollo-orbit/angular';
import { TypedDocumentNode as DocumentNode } from '@apollo-orbit/angular';
export type PalierFieldsFragment = { name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: Types.RatioType, unlocked: boolean };

export type ProductFieldsFragment = { id: number, name: string, logo: string, cout: number, croissance: number, revenu: number, vitesse: number, quantite: number, timeleft: number, managerUnlocked: boolean, paliers: Array<PalierFieldsFragment> };

export type WorldFieldsFragment = { name: string, logo: string, money: number, score: number, totalangels: number, activeangels: number, angelbonus: number, lastupdate: number, products: Array<ProductFieldsFragment>, allunlocks: Array<PalierFieldsFragment>, upgrades: Array<PalierFieldsFragment>, angelupgrades: Array<PalierFieldsFragment>, managers: Array<PalierFieldsFragment> };

export type GetWorldQueryVariables = Exact<{
  user: string;
}>;


export type GetWorldQueryData = { getWorld: WorldFieldsFragment | null };

export type AcheterQtProduitMutationVariables = Exact<{
  user: string;
  id: number;
  quantite: number;
}>;


export type AcheterQtProduitMutationData = { acheterQtProduit: ProductFieldsFragment | null };

export type LancerProductionProduitMutationVariables = Exact<{
  user: string;
  id: number;
}>;


export type LancerProductionProduitMutationData = { lancerProductionProduit: ProductFieldsFragment | null };

export type EngagerManagerMutationVariables = Exact<{
  user: string;
  name: string;
}>;


export type EngagerManagerMutationData = { engagerManager: PalierFieldsFragment | null };

export type AcheterCashUpgradeMutationVariables = Exact<{
  user: string;
  name: string;
}>;


export type AcheterCashUpgradeMutationData = { acheterCashUpgrade: PalierFieldsFragment | null };

export type AcheterAngelUpgradeMutationVariables = Exact<{
  user: string;
  name: string;
}>;


export type AcheterAngelUpgradeMutationData = { acheterAngelUpgrade: PalierFieldsFragment | null };

export type ResetWorldMutationVariables = Exact<{
  user: string;
}>;


export type ResetWorldMutationData = { resetWorld: WorldFieldsFragment | null };

export const PalierFieldsFragmentDoc = gql`
    fragment PalierFields on Palier {
  name
  logo
  seuil
  idcible
  ratio
  typeratio
  unlocked
}
    ` as DocumentNode<PalierFieldsFragment, unknown>;
export const ProductFieldsFragmentDoc = gql`
    fragment ProductFields on Product {
  id
  name
  logo
  cout
  croissance
  revenu
  vitesse
  quantite
  timeleft
  managerUnlocked
  paliers {
    ...PalierFields
  }
}
    ` as DocumentNode<ProductFieldsFragment, unknown>;
export const WorldFieldsFragmentDoc = gql`
    fragment WorldFields on World {
  name
  logo
  money
  score
  totalangels
  activeangels
  angelbonus
  lastupdate
  products {
    ...ProductFields
  }
  allunlocks {
    ...PalierFields
  }
  upgrades {
    ...PalierFields
  }
  angelupgrades {
    ...PalierFields
  }
  managers {
    ...PalierFields
  }
}
    ` as DocumentNode<WorldFieldsFragment, unknown>;
export const GET_WORLD_QUERY = gql`
    query GetWorld($user: String!) {
  getWorld(user: $user) {
    ...WorldFields
  }
}
    ${WorldFieldsFragmentDoc}
${ProductFieldsFragmentDoc}
${PalierFieldsFragmentDoc}` as DocumentNode<GetWorldQueryData, GetWorldQueryVariables>;

export function gqlGetWorldQuery(variables: GetWorldQueryVariables): { query: typeof GET_WORLD_QUERY, variables: typeof variables };
export function gqlGetWorldQuery(variables: () => GetWorldQueryVariables | null): { query: typeof GET_WORLD_QUERY, variables: typeof variables };
export function gqlGetWorldQuery(variables: any): any {
  return {
    query: GET_WORLD_QUERY,
    variables
  };
}

export const ACHETER_QT_PRODUIT_MUTATION = gql`
    mutation AcheterQtProduit($user: String!, $id: Int!, $quantite: Int!) {
  acheterQtProduit(user: $user, id: $id, quantite: $quantite) {
    ...ProductFields
  }
}
    ${ProductFieldsFragmentDoc}
${PalierFieldsFragmentDoc}` as DocumentNode<AcheterQtProduitMutationData, AcheterQtProduitMutationVariables>;

export function gqlAcheterQtProduitMutation(variables: AcheterQtProduitMutationVariables): { mutation: typeof ACHETER_QT_PRODUIT_MUTATION, variables: typeof variables } {
  return {
    mutation: ACHETER_QT_PRODUIT_MUTATION,
    variables
  };
}

export const LANCER_PRODUCTION_PRODUIT_MUTATION = gql`
    mutation LancerProductionProduit($user: String!, $id: Int!) {
  lancerProductionProduit(user: $user, id: $id) {
    ...ProductFields
  }
}
    ${ProductFieldsFragmentDoc}
${PalierFieldsFragmentDoc}` as DocumentNode<LancerProductionProduitMutationData, LancerProductionProduitMutationVariables>;

export function gqlLancerProductionProduitMutation(variables: LancerProductionProduitMutationVariables): { mutation: typeof LANCER_PRODUCTION_PRODUIT_MUTATION, variables: typeof variables } {
  return {
    mutation: LANCER_PRODUCTION_PRODUIT_MUTATION,
    variables
  };
}

export const ENGAGER_MANAGER_MUTATION = gql`
    mutation EngagerManager($user: String!, $name: String!) {
  engagerManager(user: $user, name: $name) {
    ...PalierFields
  }
}
    ${PalierFieldsFragmentDoc}` as DocumentNode<EngagerManagerMutationData, EngagerManagerMutationVariables>;

export function gqlEngagerManagerMutation(variables: EngagerManagerMutationVariables): { mutation: typeof ENGAGER_MANAGER_MUTATION, variables: typeof variables } {
  return {
    mutation: ENGAGER_MANAGER_MUTATION,
    variables
  };
}

export const ACHETER_CASH_UPGRADE_MUTATION = gql`
    mutation AcheterCashUpgrade($user: String!, $name: String!) {
  acheterCashUpgrade(user: $user, name: $name) {
    ...PalierFields
  }
}
    ${PalierFieldsFragmentDoc}` as DocumentNode<AcheterCashUpgradeMutationData, AcheterCashUpgradeMutationVariables>;

export function gqlAcheterCashUpgradeMutation(variables: AcheterCashUpgradeMutationVariables): { mutation: typeof ACHETER_CASH_UPGRADE_MUTATION, variables: typeof variables } {
  return {
    mutation: ACHETER_CASH_UPGRADE_MUTATION,
    variables
  };
}

export const ACHETER_ANGEL_UPGRADE_MUTATION = gql`
    mutation AcheterAngelUpgrade($user: String!, $name: String!) {
  acheterAngelUpgrade(user: $user, name: $name) {
    ...PalierFields
  }
}
    ${PalierFieldsFragmentDoc}` as DocumentNode<AcheterAngelUpgradeMutationData, AcheterAngelUpgradeMutationVariables>;

export function gqlAcheterAngelUpgradeMutation(variables: AcheterAngelUpgradeMutationVariables): { mutation: typeof ACHETER_ANGEL_UPGRADE_MUTATION, variables: typeof variables } {
  return {
    mutation: ACHETER_ANGEL_UPGRADE_MUTATION,
    variables
  };
}

export const RESET_WORLD_MUTATION = gql`
    mutation ResetWorld($user: String!) {
  resetWorld(user: $user) {
    ...WorldFields
  }
}
    ${WorldFieldsFragmentDoc}
${ProductFieldsFragmentDoc}
${PalierFieldsFragmentDoc}` as DocumentNode<ResetWorldMutationData, ResetWorldMutationVariables>;

export function gqlResetWorldMutation(variables: ResetWorldMutationVariables): { mutation: typeof RESET_WORLD_MUTATION, variables: typeof variables } {
  return {
    mutation: RESET_WORLD_MUTATION,
    variables
  };
}

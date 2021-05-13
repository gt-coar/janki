// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.
/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Configure Janki spaced-repetition cards
 */
export type CardCollections = JankiSettings;

/**
 * user-configured settings
 */
export interface JankiSettings {
  /**
   * Ephemeral collections not saved in files
   */
  collections?: Collection[];
  [k: string]: unknown;
}
/**
 * a full description of a collection of spaced-repetition cards, as returned by the server
 */
export interface Collection {
  cards: Card[];
  notes: Note[];
  /**
   * the contents path to the collection
   */
  path: string;
  revs: Rev[];
}
export interface Card {
  cdeck: string;
  cdue: number;
  cfactor: number;
  civl: number;
  clapses: number;
  cleft: number;
  cmod: number;
  codeck: string;
  codue: number;
  cord: number;
  cqueue: string;
  creps: number;
  ctype: string;
  cusn: number;
  nid: number;
}
export interface Note {
  nflds: string[];
  nguid: string;
  nmod: number;
  nmodel: string;
  ntags: string[];
  nusn: number;
}
export interface Rev {
  cid: number;
  rease: number;
  rfactor: number;
  rivl: number;
  rlastIvl: number;
  rtime: number;
  rtype: string;
  rusn: number;
}

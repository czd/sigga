/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as FamilyCode from "../FamilyCode.js";
import type * as accessCodes from "../accessCodes.js";
import type * as activity from "../activity.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as backup from "../backup.js";
import type * as comments from "../comments.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as documents from "../documents.js";
import type * as entitlements from "../entitlements.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as journalReads from "../journalReads.js";
import type * as logEntries from "../logEntries.js";
import type * as medications from "../medications.js";
import type * as reactions from "../reactions.js";
import type * as recurringSeries from "../recurringSeries.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";
import type * as whitelist from "../whitelist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  FamilyCode: typeof FamilyCode;
  accessCodes: typeof accessCodes;
  activity: typeof activity;
  appointments: typeof appointments;
  auth: typeof auth;
  backup: typeof backup;
  comments: typeof comments;
  contacts: typeof contacts;
  crons: typeof crons;
  documents: typeof documents;
  entitlements: typeof entitlements;
  events: typeof events;
  http: typeof http;
  journalReads: typeof journalReads;
  logEntries: typeof logEntries;
  medications: typeof medications;
  reactions: typeof reactions;
  recurringSeries: typeof recurringSeries;
  seed: typeof seed;
  users: typeof users;
  whitelist: typeof whitelist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

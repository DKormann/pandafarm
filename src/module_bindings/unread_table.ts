// THIS FILE IS AUTOMATICALLY GENERATED BY SPACETIMEDB. EDITS TO THIS FILE
// WILL NOT BE SAVED. MODIFY TABLES IN YOUR MODULE SOURCE CODE INSTEAD.

/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
import {
  AlgebraicType,
  AlgebraicValue,
  BinaryReader,
  BinaryWriter,
  CallReducerFlags,
  ConnectionId,
  DbConnectionBuilder,
  DbConnectionImpl,
  DbContext,
  ErrorContextInterface,
  Event,
  EventContextInterface,
  Identity,
  ProductType,
  ProductTypeElement,
  ReducerEventContextInterface,
  SubscriptionBuilderImpl,
  SubscriptionEventContextInterface,
  SumType,
  SumTypeVariant,
  TableCache,
  TimeDuration,
  Timestamp,
  deepEqual,
} from "@clockworklabs/spacetimedb-sdk";
import { Unread } from "./unread_type";
import { EventContext, Reducer, RemoteReducers, RemoteTables } from ".";

/**
 * Table handle for the table `unread`.
 *
 * Obtain a handle from the [`unread`] property on [`RemoteTables`],
 * like `ctx.db.unread`.
 *
 * Users are encouraged not to explicitly reference this type,
 * but to directly chain method calls,
 * like `ctx.db.unread.on_insert(...)`.
 */
export class UnreadTableHandle {
  tableCache: TableCache<Unread>;

  constructor(tableCache: TableCache<Unread>) {
    this.tableCache = tableCache;
  }

  count(): number {
    return this.tableCache.count();
  }

  iter(): Iterable<Unread> {
    return this.tableCache.iter();
  }
  /**
   * Access to the `receiver` unique index on the table `unread`,
   * which allows point queries on the field of the same name
   * via the [`UnreadReceiverUnique.find`] method.
   *
   * Users are encouraged not to explicitly reference this type,
   * but to directly chain method calls,
   * like `ctx.db.unread.receiver().find(...)`.
   *
   * Get a handle on the `receiver` unique index on the table `unread`.
   */
  receiver = {
    // Find the subscribed row whose `receiver` column value is equal to `col_val`,
    // if such a row is present in the client cache.
    find: (col_val: Identity): Unread | undefined => {
      for (let row of this.tableCache.iter()) {
        if (deepEqual(row.receiver, col_val)) {
          return row;
        }
      }
    },
  };

  onInsert = (cb: (ctx: EventContext, row: Unread) => void) => {
    return this.tableCache.onInsert(cb);
  }

  removeOnInsert = (cb: (ctx: EventContext, row: Unread) => void) => {
    return this.tableCache.removeOnInsert(cb);
  }

  onDelete = (cb: (ctx: EventContext, row: Unread) => void) => {
    return this.tableCache.onDelete(cb);
  }

  removeOnDelete = (cb: (ctx: EventContext, row: Unread) => void) => {
    return this.tableCache.removeOnDelete(cb);
  }

  // Updates are only defined for tables with primary keys.
  onUpdate = (cb: (ctx: EventContext, oldRow: Unread, newRow: Unread) => void) => {
    return this.tableCache.onUpdate(cb);
  }

  removeOnUpdate = (cb: (ctx: EventContext, onRow: Unread, newRow: Unread) => void) => {
    return this.tableCache.removeOnUpdate(cb);
  }}

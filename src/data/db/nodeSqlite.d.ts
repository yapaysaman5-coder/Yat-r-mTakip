/** Minimal types for Node's built-in SQLite, used only by the test driver (./nodeDriver.ts). */
declare module 'node:sqlite' {
  type Value = string | number | bigint | null | Uint8Array;
  export class StatementSync {
    run(...params: Value[]): { changes: number | bigint };
    all(...params: Value[]): unknown[];
    get(...params: Value[]): unknown;
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}

declare module "node:sqlite" {
  export class DatabaseSync {
    public constructor(filename: string);
    public exec(source: string): void;
    public prepare(source: string): {
      get(...parameters: unknown[]): unknown;
      all(...parameters: unknown[]): unknown[];
      run(...parameters: unknown[]): unknown;
    };
    public close(): void;
  }
}

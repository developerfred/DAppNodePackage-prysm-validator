import low from "lowdb";
import fs from "fs";
import path from "path";
import FileSync from "lowdb/adapters/FileSync";
import { logs } from "../logs";

type Indexer = string | number;

export function lowDbFactory(
  dbPath: string,
  options?: low.AdapterOptions<any>
): low.LowdbSync<any> {
  // Define dbPath and make sure it exists (mkdir -p)
  if (fs.existsSync(dbPath)) {
    logs.info(`Connecting to existing lowdb ${dbPath}`);
  } else {
    const dir = path.parse(dbPath).dir;
    logs.info(`Creating new lowdb ${dbPath}`);
    if (dir) fs.mkdirSync(dir, { recursive: true });
    logs.info(`Created new lowdb ${dbPath}`);
  }

  // Initialize db
  const adapter = new FileSync(dbPath, options);
  return low(adapter);
}

export function createLowDb(dbPath: string) {
  const db = lowDbFactory(dbPath);

  function formatKey(key: Indexer): string {
    key = String(key).replace(/\./g, "");
    if (!key) throw Error(`key to access the db must be defined`);
    return key;
  }

  const get = <T>(key: Indexer): T | undefined =>
    db.get(formatKey(key)).value();
  const set = <T>(key: Indexer, value: T): void =>
    db.set(formatKey(key), value).write();
  const del = (key: string): void => {
    db.unset(formatKey(key)).write();
  };
  return {
    get,
    set,
    del
  };
}

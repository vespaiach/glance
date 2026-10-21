import { databaseContract } from "../contract";
import { openMemoryDatabase } from ".";

let db = openMemoryDatabase();

beforeEach(() => {
  db = openMemoryDatabase();
});

databaseContract(() => db);

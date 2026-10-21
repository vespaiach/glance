import { databaseContract } from "../contract";
import { postgresDatabase } from ".";
import { migratedSqlPerTest } from "./testSql";

const sql = migratedSqlPerTest();

databaseContract(() => postgresDatabase(sql()));

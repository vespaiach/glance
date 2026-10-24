import * as v from "valibot";
import { AccountSchema, AccountSettingsSchema, WeatherSchema } from "@/domain/schemas";
import { FIXTURE_ACCOUNT, FIXTURE_SETTINGS, FIXTURE_WEATHER } from "./data";

describe("test fixtures", () => {
  it("tech§7 every row passes its domain schema", () => {
    v.parse(WeatherSchema, FIXTURE_WEATHER);
    v.parse(AccountSettingsSchema, FIXTURE_SETTINGS);
    v.parse(AccountSchema, FIXTURE_ACCOUNT);
  });
});

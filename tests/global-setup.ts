import type { TestProject } from "vitest/node";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/db/schema";

// Generate the schema DDL once (drizzle-kit is slow to import) and hand it to every test file
export default async function setup(project: TestProject) {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  project.provide("schemaSql", statements);
}

declare module "vitest" {
  export interface ProvidedContext {
    schemaSql: string[];
  }
}

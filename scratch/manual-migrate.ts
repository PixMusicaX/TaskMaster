import postgres from 'postgres';

const sql = postgres("postgresql://neondb_owner:npg_mZsT7qXi1erB@ep-twilight-queen-an1rdg84-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require");

async function migrate() {
  try {
    console.log("Checking for PreparationTip table...");
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_name = 'PreparationTip'
      );
    `;

    if (!tableExists[0].exists) {
      console.log("Creating PreparationTip table...");
      await sql`
        CREATE TABLE "PreparationTip" (
          "id" text PRIMARY KEY,
          "title" text NOT NULL,
          "description" text,
          "date" text UNIQUE NOT NULL,
          "completed" boolean DEFAULT false NOT NULL,
          "xpReward" integer DEFAULT 15 NOT NULL,
          "stat" text DEFAULT 'intelligence' NOT NULL,
          "createdAt" timestamp DEFAULT now() NOT NULL
        );
      `;
    } else {
      console.log("Checking for missing columns in PreparationTip...");
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'PreparationTip';
      `;
      
      const columnNames = columns.map(c => c.column_name);
      
      if (!columnNames.includes('xpReward')) {
        console.log("Adding xpReward column...");
        await sql`ALTER TABLE "PreparationTip" ADD COLUMN "xpReward" integer DEFAULT 15 NOT NULL;`;
      }
      
      if (!columnNames.includes('stat')) {
        console.log("Adding stat column...");
        await sql`ALTER TABLE "PreparationTip" ADD COLUMN "stat" text DEFAULT 'intelligence' NOT NULL;`;
      }
    }

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sql.end();
  }
}

migrate();

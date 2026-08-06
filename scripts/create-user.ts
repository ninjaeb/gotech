import "dotenv/config";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    name: { type: "string" },
    title: { type: "string" },
    password: { type: "string" },
  },
});

async function main() {
  if (!values.email || !values.name) {
    console.error(
      'Usage: npm run create-user -- --email="jane@example.com" --name="Jane Doe" [--title="Sales"] [--password="..."]',
    );
    process.exit(1);
  }

  const email = values.email.trim().toLowerCase();
  const password = values.password || randomBytes(9).toString("base64url");

  const user = await db.user.create({
    data: {
      email,
      name: values.name.trim(),
      title: values.title?.trim() || null,
      passwordHash: await hashPassword(password),
    },
  });

  console.log(`\nCreated user: ${user.name} <${user.email}>`);
  if (!values.password) {
    console.log(`Password: ${password}`);
    console.log("(shown once — store it somewhere safe)\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error?.code === "P2002") {
      console.error("A user with that email already exists.");
    } else {
      console.error(error);
    }
    process.exit(1);
  });

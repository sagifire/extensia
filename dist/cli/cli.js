// src/cli.ts
import process from "process";
async function main() {
  const args = process.argv.slice(2);
  console.log("extensia-cli args:", args);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});

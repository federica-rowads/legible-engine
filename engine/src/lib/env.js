// Imported FIRST by run.js so .env is loaded before any Anthropic client or the
// agent registry reads process.env (ESM evaluates imports before the body).
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // engine/src/lib
dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });       // engine/.env
dotenv.config({ path: path.join(__dirname, "..", "..", "..", ".env") }); // repo-root .env

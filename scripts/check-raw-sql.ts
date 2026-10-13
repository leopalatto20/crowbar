// Flags raw SQL in the data module that behaves differently on expo-sqlite and bun:sqlite.
// Tests run on bun:sqlite only, so these differences never fail a test; see apps/native/db/open.ts.
// Usage: bun scripts/check-raw-sql.ts [files...]  (no files: scans the whole data module)
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_MODULE = "apps/native/db/";
const MIGRATIONS = "apps/native/db/migrations/";

// Pragma assignments verified to return no row. Every other PRAGMA may return one: reads always
// do, and some assignments echo the new value (`PRAGMA journal_mode = WAL`).
const SILENT_PRAGMA_ASSIGNMENTS = new Set([
  "application_id",
  "auto_vacuum",
  "automatic_index",
  "cache_size",
  "cell_size_check",
  "defer_foreign_keys",
  "foreign_keys",
  "page_size",
  "query_only",
  "recursive_triggers",
  "synchronous",
  "temp_store",
  "trusted_schema",
  "user_version",
]);

const RUN_MESSAGE =
  "run() on row-returning SQL: expo-sqlite leaves the statement open mid-step and SQLite then refuses every later COMMIT. Use db.all(...).";
const GET_MESSAGE =
  "get() on raw SQL: it returns an object on expo-sqlite but an array on bun:sqlite. Use db.all(...) and take the first row.";

function returnsRows(statement: string) {
  const text = statement.trim();
  const pragma = /^PRAGMA\s+(?:\w+\.)?(\w+)\s*(=)?/i.exec(text);
  if (pragma) return !(pragma[2] && SILENT_PRAGMA_ASSIGNMENTS.has(pragma[1]!.toLowerCase()));
  return /^(SELECT|WITH|VALUES)\b/i.test(text) || /\bRETURNING\b/i.test(text);
}

// The literal text of `sql\`...\`` or `sql.raw(\`...\`)`, or undefined when the argument is not raw SQL.
function rawSqlText(node: ts.Expression): string | undefined {
  if (ts.isTaggedTemplateExpression(node) && node.tag.getText() === "sql") {
    return templateText(node.template);
  }
  if (ts.isCallExpression(node) && node.expression.getText() === "sql.raw") {
    const [argument] = node.arguments;
    if (argument && (ts.isTemplateLiteral(argument) || ts.isStringLiteral(argument))) {
      return templateText(argument);
    }
    return "";
  }
  return undefined;
}

function templateText(template: ts.TemplateLiteral | ts.StringLiteral) {
  if (ts.isNoSubstitutionTemplateLiteral(template) || ts.isStringLiteral(template)) {
    return template.text;
  }
  return [template.head.text, ...template.templateSpans.map((span) => span.literal.text)].join(" ");
}

function problemWith(method: string, argument: ts.Expression) {
  const text = rawSqlText(argument);
  if (text === undefined) return undefined;
  if (method === "get") return GET_MESSAGE;
  if (method === "run" && returnsRows(text)) return RUN_MESSAGE;
  return undefined;
}

function check(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const problems: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.arguments[0]
    ) {
      const message = problemWith(node.expression.name.text, node.arguments[0]);
      if (message) {
        const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
        problems.push(`${path.relative(ROOT, file)}:${line + 1}:${character + 1} ${message}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

function inScope(file: string) {
  const relative = path.relative(ROOT, file).split(path.sep).join("/");
  return (
    relative.startsWith(DATA_MODULE) &&
    !relative.startsWith(MIGRATIONS) &&
    /\.(ts|tsx)$/.test(relative)
  );
}

const files =
  process.argv.length > 2
    ? process.argv.slice(2).map((file) => path.resolve(file))
    : globSync(`${DATA_MODULE}**/*.{ts,tsx}`, { cwd: ROOT }).map((file) => path.join(ROOT, file));

const problems = files.filter(inScope).flatMap(check);
for (const problem of problems) console.error(problem);
if (problems.length > 0) process.exit(1);

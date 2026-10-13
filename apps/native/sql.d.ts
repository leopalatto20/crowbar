// Migration files arrive as strings through babel-plugin-inline-import.
declare module "*.sql" {
  const sql: string;
  export default sql;
}

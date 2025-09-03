import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();
interface connectionString {
  DATABASE_URL: string;
}
const connectionString = process.env.PROD_DATABASE_URL;

const sql = postgres(connectionString!, {
  max: 1,
  idle_timeout: 10,
});

export default sql;

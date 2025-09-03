import cron from "node-cron";
import fetchAndUpsertAll from "./worker.js";

cron.schedule("*/5 * * * *", () => {
  console.log("Running task every 5 minutes");

  fetchAndUpsertAll()
    .then(() => {
      console.log("Worker finished");
    })
    .catch((err) => {
      console.error("Worker error:", err);
    });
});

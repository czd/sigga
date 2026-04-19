import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
	"ensure recurring appointment occurrences",
	"10 0 * * *",
	internal.recurringSeries.ensureNextOccurrences,
);

crons.cron("weekly backup", "0 3 * * 0", internal.backup.weeklyExport);

export default crons;

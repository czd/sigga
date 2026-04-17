import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron(
	"ensure recurring appointment occurrences",
	"10 0 * * *",
	internal.recurringSeries.ensureNextOccurrences,
);

export default crons;

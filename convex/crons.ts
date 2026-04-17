import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"ensure recurring appointment occurrences",
	{ hourUTC: 0, minuteUTC: 10 },
	internal.recurringSeries.ensureNextOccurrences,
);

export default crons;

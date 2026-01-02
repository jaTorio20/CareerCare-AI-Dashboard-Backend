import pino from "pino";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  base: {
    pid: false, // remove pid
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

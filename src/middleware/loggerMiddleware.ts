import pinoHttp from "pino-http";
import logger from "../utils/logger";

const isSilent = process.env.NODE_ENV === "test";

export const httpLogger = pinoHttp({
  logger,
  enabled: !isSilent,
  customLogLevel: (res, err) => {
    const statusCode = res.statusCode ?? 0;

    if (err || statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  },
});

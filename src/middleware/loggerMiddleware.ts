import pinoHttp from "pino-http";
import logger from "../utils/logger";

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => {
    const statusCode = res.statusCode ?? 0;

    if (err || statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  },
});

const fs = require("fs");
const SimpleNodeLogger = require("simple-node-logger");

// Logging to files
const fileLogConfig = {
  logDirectory: "./logs/",
  errorEventName: "error",
  fileNamePattern: "log-<DATE>.log",
  dateFormat: "YYYY-MM-DD",
};

if (!fs.existsSync(fileLogConfig.logDirectory)) {
  fs.mkdirSync(fileLogConfig.logDirectory);
}

fileLog = SimpleNodeLogger.createRollingFileLogger(fileLogConfig);
consoleLog = SimpleNodeLogger.createSimpleLogger();

const validLogLevels = ["trace", "debug", "info", "warn", "error", "fatal"];

add = (message, type = "info") => {
  type = validLogLevel(type, "info");
  fileLog.log(type, message);
  consoleLog.log(type, message);
};

const setLogLevel = (logLevel) => {
  logLevel = validLogLevel(logLevel);

  fileLog.setLevel(logLevel);
  consoleLog.setLevel(logLevel);
};

const validLogLevel = (logLevel, fallback) => {
  if (!validLogLevels.includes(logLevel)) {
    fileLog.log(
      "warn",
      "Invalid Log Level " + logLevel + " changed to " + fallback
    );
    consoleLog.log(
      "warn",
      "Invalid Log Level " + logLevel + " changed to " + fallback
    );

    return fallback;
  }
  return logLevel;
};

exports.add = add;
exports.setLogLevel = setLogLevel;

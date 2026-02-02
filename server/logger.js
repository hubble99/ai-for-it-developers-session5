import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

// Define file format (without colors)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(
        (info) => `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

// Define logs directory relative to project root (up one level from server directory)
const logsDir = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: format,
    }),

    // Error log file - rotates daily, keeps 30 days
    new DailyRotateFile({
        dirname: logsDir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: fileFormat,
        maxFiles: '30d',
        maxSize: '20m',
    }),

    // Combined log file - rotates daily, keeps 14 days
    new DailyRotateFile({
        dirname: logsDir,
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        format: fileFormat,
        maxFiles: '14d',
        maxSize: '20m',
    }),

    // HTTP requests log - rotates daily, keeps 7 days
    new DailyRotateFile({
        dirname: logsDir,
        filename: 'http-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'http',
        format: fileFormat,
        maxFiles: '7d',
        maxSize: '20m',
    }),
];

// Create the logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    transports,
    exitOnError: false, // Don't exit on handled exceptions
    handleExceptions: true,
    handleRejections: true,
});

// Prevent process from exiting prematurely
process.stdin.resume();

export default logger;

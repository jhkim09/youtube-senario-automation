import winston from 'winston';
import path from 'path';
import { config } from '../config/index.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'youtube-automation' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.paths.logs || './logs', 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(config.paths.logs || './logs', 'combined.log')
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
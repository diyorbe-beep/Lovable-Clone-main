import winston from 'winston';

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

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

// Add custom methods for structured logging
class Logger {
  static error(message: string, meta?: any) {
    logger.error(message, meta);
  }

  static warn(message: string, meta?: any) {
    logger.warn(message, meta);
  }

  static info(message: string, meta?: any) {
    logger.info(message, meta);
  }

  static http(message: string, meta?: any) {
    logger.http(message, meta);
  }

  static debug(message: string, meta?: any) {
    logger.debug(message, meta);
  }

  // Structured logging methods
  static logUserAction(userId: string, action: string, metadata?: any) {
    logger.info(`User action: ${action}`, {
      type: 'user_action',
      userId,
      action,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logApiRequest(method: string, url: string, statusCode: number, responseTime: number, userId?: string) {
    logger.http(`${method} ${url} - ${statusCode}`, {
      type: 'api_request',
      method,
      url,
      statusCode,
      responseTime,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  static logError(error: Error, context?: any) {
    logger.error('Application error', {
      type: 'application_error',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  static logPerformance(operation: string, duration: number, metadata?: any) {
    logger.info(`Performance: ${operation} took ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logSecurity(event: string, severity: 'low' | 'medium' | 'high', metadata?: any) {
    logger.warn(`Security event: ${event}`, {
      type: 'security',
      event,
      severity,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logBilling(event: string, userId: string, amount?: number, metadata?: any) {
    logger.info(`Billing event: ${event}`, {
      type: 'billing',
      event,
      userId,
      amount,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  static logAI(model: string, prompt: string, response: string, tokens?: number, metadata?: any) {
    logger.info(`AI request: ${model}`, {
      type: 'ai_request',
      model,
      promptLength: prompt.length,
      responseLength: response.length,
      tokens,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }
}

export default Logger;

export declare const VERSION = "nextworld-1.0.0";
type LogLevel = 'info' | 'warn' | 'error' | 'debug' | string;
interface LogDetails {
    [key: string]: any;
}
interface LogEvent {
    level: LogLevel;
    message: string;
    details: LogDetails;
    timestamp: string;
}
export declare class Logger {
    private static binder;
    static log(level: LogLevel | undefined, message: string, details?: LogDetails): void;
    static info(msg: string, details?: LogDetails): void;
    static warn(msg: string, details?: LogDetails): void;
    static error(msg: string, details?: LogDetails): void;
    static debug(msg: string, details?: LogDetails): void;
    static onLog(fn: (e: LogEvent) => void): void;
}
export {};

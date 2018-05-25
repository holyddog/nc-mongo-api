import { Config } from './config';

import * as winston from 'winston';
require('winston-daily-rotate-file');

export class Logger {
    public static info(text: string): void {
        new winston.Logger({
            transports: [
                new (winston.transports.Console)()
            ]
        }).info(text);
    };

    public static debug(text: string): void {
        new winston.Logger({
            transports: [
                new (winston.transports.DailyRotateFile)({
                    filename: 'debug-',
                    json: false,
                    datePattern: 'yyyyMMdd.log',
                    dirname: Config.LogDir
                })
            ]
        }).info(text);
    };

    public static error(text: string): void {
        new winston.Logger({
            transports: [
                new (winston.transports.DailyRotateFile)({
                    filename: 'error-',
                    json: false,
                    datePattern: 'yyyyMMdd.log',
                    dirname: Config.LogDir
                })
            ]
        }).error(text);
    };
}
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as mongodb from 'mongodb';
import * as mssql from 'mssql';

import * as fileUpload from 'express-fileupload';

import errorHandler = require("errorhandler");
import methodOverride = require("method-override");

var cors = require('cors');

import { Config } from './config';
import { OAuth2 } from './oauth2';
import { Logger } from './logger';

import { FormApi } from './api/form.api';
import { DataApi } from './api/data.api';
import { FileApi } from './api/file.api';

import { ProductApi as DBD_ProductApi } from './api/backend/dbd/product.api';
import { BookingApi as DBD_BookingApi } from './api/backend/dbd/booking.api';

export class Server {
    public app: express.Express;
    public callback: any;

    public static bootstrap(app, callback): Server {
        return new Server(app, callback);
    };

    constructor(app, callback) {
        if (app) {
            this.app = app;
            this.callback = callback;
        }
        else {
            this.app = express();
        }

        this.config().then((config: any) => {
            let dataDB: mongodb.Db = config.dataDB;
            let sqlDB: mssql.ConnectionPool = config.sqlDB;

            // let request: mssql.Request = new mssql.Request(sqlDB);
            // request
            //     .input('qty', mssql.Int, 5)
            //     .query('select LOGIN_NAME from z_user where usr_id < @qty')
            //     .then((data: mssql.IResult<any>) => {
            //         console.log(data.recordset);
            //     });

            new OAuth2(this.app, dataDB);

            this.api(dataDB);
        });
    }

    public api(dataDB: mongodb.Db) {
        let app = this.app;
        app.disable('etag');

        new FormApi(dataDB, app);
        new DataApi(dataDB, app);
        new FileApi(dataDB, app);

        new DBD_ProductApi(dataDB, app);
        new DBD_BookingApi(dataDB, app);

        app.get('/version', (req, res) => {
            let v = Config.Version;

            res.json({ version: `${v.base}.${v.major}.${v.minor}` });
        });

        if (this.callback != 'function') {
            let server = app.listen(Config.Port, () => {
                Logger.info(`Listening on: ${Config.Port}` + ' at ' + new Date().toString());
    
                let v = Config.Version;
                Logger.info(Config.AppName + ` version ${v.base}.${v.major}.${v.minor}`);
            });
        }
    }

    public async config() {
        let app = this.app;

        app.use(cookieParser('nc-mongo-api'));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(cors());
        app.use(fileUpload());
        app.use(Config.FilePath, express.static(Config.FileDir));

        app.use(function (req, res, next) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PUT,PATCH,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

            next();
        });

        let mongo = mongodb.MongoClient;
        let dataDB: mongodb.Db;
        return mongo.connect(Config.MongoUri)
            .then((db: mongodb.Db) => {
                dataDB = db;
                return Promise.resolve({
                    sqlDB: null,
                    dataDB: dataDB
                })
            })
            // .then((db: mongodb.Db) => {
            //     dataDB = db;
            //     return new mssql.ConnectionPool(Config.MSSQL).connect();
            // })
            // .then((pool: mssql.ConnectionPool) => {
            //     return Promise.resolve({
            //         sqlDB: pool,
            //         dataDB: dataDB
            //     })
            // })
            .catch(err => {
                console.log(err);
            });
    }
}
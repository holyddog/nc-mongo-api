import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as mongodb from 'mongodb';
import * as mssql from 'mssql';

import * as fileUpload from 'express-fileupload';

var cors = require('cors');

import { Config } from './config';
import { OAuth2 } from './oauth2';

import { FormApi } from './api/form.api';
import { DataApi } from './api/data.api';
import { FileApi } from './api/file.api';

import { ProductApi as DBD_ProductApi } from './api/backend/dbd/product.api';
import { BookingApi as DBD_BookingApi } from './api/backend/dbd/booking.api';

import { DocumentFunction } from './api/fn/document.function';

export class Server {
    public prefix: string;
    public app: express.Express;
    public router: express.Router;

    constructor(app, router, prefix) {
        if (app) {
            this.app = app;
            this.router = router;
            this.prefix = prefix;
        }
        else {
            this.app = express();
            this.router = express.Router();
        }
    }

    public run(): Promise<any> {       
        return this.config()
            .then((config: any) => {
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

                return Promise.resolve();
            });
    }

    public api(dataDB: mongodb.Db) {
        let app = this.app;
        app.disable('etag');

        new FormApi(dataDB, this.router);
        new DataApi(dataDB, this.router);
        new FileApi(dataDB, this.router);

        new DBD_ProductApi(dataDB, this.router);
        new DBD_BookingApi(dataDB, this.router);

        new DocumentFunction(dataDB, this.router);

        this.router.get('/version', (req, res) => {
            let v = Config.Version;

            res.json({ version: `${v.base}.${v.major}.${v.minor}` });
        });

        if (!this.prefix) {
            app.use("/", this.router);
        }
        else {
            app.use(this.prefix, this.router);
        }
    }

    public config() {
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
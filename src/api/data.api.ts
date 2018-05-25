import * as mongodb from 'mongodb';
import * as express from 'express';
import * as request from 'request-promise';

import * as api from '../base-api';
import { Translation as t } from '../translate/translation';

import { Config } from '../config';
import { ErrorModel } from '../models/error.model';

export class DataApi {
    private forms: mongodb.Collection;
    private dataDB: mongodb.Db;

    constructor(dataDB: mongodb.Db, app: express.Express) {
        this.dataDB = dataDB;

        app.post('/data', (req, res) => {
            this.fetchData(req, res);
        });
        
        app.get('/data/:key', (req, res) => {
            this.getData(req, res);
        });
    }

    getData(req, res) {
        let filter: any = {};
        filter[req.query.pk] = +req.params.key;

        this.dataDB.collection(req.query.collection).find(filter, { _id: 0 })
            .toArray()
            .then(data => {
                if (data.length) {
                    res.json(data[0]);
                }
                else {
                    res.json({});
                }
            });
    }

    fetchData(req, res) {
        let bd: any = req.body;

        let limit: number = Math.max(0, parseInt(req.query.size) || 100);
        let start: number = Math.max(0, ((parseInt(req.query.page) || 1) - 1) * limit);

        let resultData: any[] = [];
        eval(`this.dataDB.collection('${bd.collection}').find(${bd.find})`)
            .skip(start)
            .limit(limit)
            .toArray()
            .then(data => {
                resultData = data;
                var count = eval(`this.dataDB.collection('${bd.collection}').count(${bd.find})`);
                return count;
            })
            .then(count => {
                res.json({
                    total: count,
                    data: resultData
                });
            });
    }
}
import * as mongodb from 'mongodb';
import * as express from 'express';
import * as request from 'request-promise';

import * as api from '../base-api';
import { Translation as t } from '../translate/translation';

import { Config } from '../config';
import { ErrorModel } from '../models/error.model';

export class DataApi {
    private dataDB: mongodb.Db;
    private workspaces: mongodb.Collection;

    constructor(dataDB: mongodb.Db, router: express.Router) {
        this.dataDB = dataDB;
        this.workspaces = dataDB.collection('zz_workspace');

        router.get('/ws/verify', (req, res) => {
            this.verifyWorkspace(req, res);
        });

        router.post('/data', (req, res) => {
            this.fetchData(req, res);
        });

        router.post('/query', (req, res) => {
            this.queryData(req, res);
        });

        router.post('/paging', (req, res) => {
            this.pagingData(req, res);
        });

        router.get('/data/:key', (req, res) => {
            this.getData(req, res);
        });
    }

    verifyWorkspace(req, res) {
        this.workspaces.find({
            "data.hosts": req.headers.origin,
            "data.path": req.query.href
        }, {
                _id: 0,
                wsp_id: 1,
                wsp_name: 1,
                "data.app_name": 1,
                "data.logo": 1

            }).toArray().then(data => {
                if (data.length > 0) {
                    res.json(data[0]);
                }
                else {
                    res.json(new ErrorModel(
                        `Workspace not found.`
                    ));
                }
            });
    }

    pagingData(req, res) {
        let bd: any = req.body;

        let limit: number = Math.max(0, parseInt(req.query.size) || 100);
        let start: number = Math.max(0, ((parseInt(req.query.page) || 1) - 1) * limit);

        let resultData: any[] = [];
        eval(`this.dataDB.collection${bd.query}`)
            .skip(start)
            .limit(limit)
            .toArray()
            .then(data => {
                resultData = data;
                var count = eval(`this.dataDB.collection${bd.count}`);
                return count;
            })
            .then(count => {
                res.json({
                    total: count,
                    data: resultData
                });
            });
    }

    queryData(req, res) {
        let bd: any = req.body;

        if (bd.collection) {
            if (!bd.aggregate) {
                if (!bd.find) {
                    bd.find = {};
                }
                var promise = this.dataDB.collection(bd.collection).find(bd.find);
                if (bd.sort) {
                    promise = promise.sort(bd.sort);
                }

                promise.toArray()
                    .then(data => {
                        if (req.query.single == 1) {
                            data = data[0];
                        }
                        res.json(data);
                    });
            }
            else {
                let aggList: any[] = [];
                if (bd.find) {
                    aggList.push({
                        $match: bd.find
                    });
                }
                if (bd.aggregate) {
                    aggList = aggList.concat(bd.aggregate);
                }

                var aggFind = aggList;
                if (bd.sort) {
                    aggFind.push({
                        $sort: bd.sort
                    });
                }
                this.dataDB.collection(bd.collection).aggregate(aggFind).toArray()
                    .then(data => {
                        if (req.query.single == 1) {
                            data = data[0];
                        }
                        res.json(data);
                    });
            }
        }
        else {
            eval(`this.dataDB.collection${bd.query}`)
                .toArray()
                .then(data => {
                    if (req.query.single == 1) {
                        data = data[0];
                    }
                    res.json(data);
                })
                .catch(err => {
                    res.json(null);
                });
        }
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
        if (bd.find) {
            var fetch = function (data) {
                if (data) {
                    for (let i in data) {
                        if (typeof data[i] == 'object') {
                            fetch(data[i]);
                        }
                        else {
                            var regex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
                            if (regex.test(data[i])) {
                                data[i] = new Date(data[i]);
                            }
                        }
                    }
                }
            }
            fetch(bd.find);

            var promise = this.dataDB.collection(bd.collection).find(bd.find);
            if (bd.sort) {
                promise = promise.sort(bd.sort);
            }

            promise
                .skip(start)
                .limit(limit)
                .toArray()
                .then(data => {
                    resultData = data;
                    var count = this.dataDB.collection(bd.collection).count(bd.find); // eval(`this.dataDB.collection('${bd.collection}').count(${bd.find})`);
                    return count;
                })
                .then(count => {
                    res.json({
                        total: count,
                        data: resultData
                    });
                });
        }
        else if (bd.aggregate) {
            let aggList: any[] = [];

            var agg = [];
            for (let a of bd.aggregate) {
                var hasValue = true;
                if (a["$match"]) {
                    var fetch = function (data) {
                        if (data) {
                            for (let i in data) {
                                if (typeof data[i] == 'object') {
                                    fetch(data[i]);
                                }
                                else {
                                    var regex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
                                    if (regex.test(data[i])) {
                                        data[i] = new Date(data[i]);
                                    }
                                }
                            }
                        }
                    }
                    fetch(a["$match"]);
                }

                if (hasValue) {
                    agg.push(a);
                }
            }
            aggList = aggList.concat(agg);

            // if (bd.find) {
            //     var fetch = function (data) {
            //         if (data) {
            //             for (let i in data) {
            //                 if (typeof data[i] == 'object') {
            //                     fetch(data[i]);
            //                 }
            //                 else {
            //                     var regex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;
            //                     if (regex.test(data[i])) {
            //                         data[i] = new Date(data[i]);
            //                     }
            //                 }
            //             }
            //         }
            //     }
            //     fetch(bd.find);

            //     aggList.push({
            //         $match: bd.find
            //     });
            // }

            var aggFind = aggList;
            if (bd.sort) {
                aggFind.push({
                    $sort: bd.sort
                });
            }

            this.dataDB.collection(bd.collection).aggregate(aggFind.concat([
                { $skip: start },
                { $limit: limit }
            ])).toArray()
                .then(data => {
                    resultData = data;
                    return this.dataDB.collection(bd.collection).aggregate(aggList.concat([{
                        $count: "count"
                    }])).next()
                })
                .then(count => {
                    var total = (count) ? count.count : 0;
                    res.json({
                        total: total,
                        data: resultData
                    });
                });
        }
        else {
            res.json(new ErrorModel("Invalid form format."));
        }
    }
}
import * as mongodb from 'mongodb';
import * as express from 'express';
import * as request from 'request-promise';
import * as fs from 'fs';

import * as api from '../base-api';
import { Translation as t } from '../translate/translation';

import { Config } from '../config';
import { FormModel } from '../models/form.model';
import { ErrorModel } from '../models/error.model';
import { DateTime } from '../../node_modules/@types/mssql';

export class FormApi {
    private forms: mongodb.Collection;
    private dataDB: mongodb.Db;

    constructor(dataDB: mongodb.Db, app: express.Express) {
        this.dataDB = dataDB;

        app.get('/forms/:id', (req, res) => {
            this.findFormById(req, res);
        });

        app.get('/menu', (req, res) => {
            this.findMenu(req, res);
        });

        app.post('/forms', (req, res) => {
            this.insertFormData(req, res);
        });

        app.put('/forms', (req, res) => {
            this.updateFormData(req, res);
        });
    }

    updateFormData(req, res) {
        let bd: any = req.body;

        let saveData: any = {};
        let nullData: any = {};
        let hasNull: boolean = false;

        for (let index in bd.data) {
            let value: any = bd.data[index];
            if (value || value === 0 || value === false) {
                if (value instanceof Array) {
                    for (let i of value) {
                        for (let j in i) {
                            if (typeof i[j] == 'object') {
                                if (i[j].type == 'date' && i[j].value) {
                                    i[j] = new Date(i[j].value);
                                }
                            }
                        }
                    }                  
                }
                else if (typeof value == 'object') {
                    if (value.type == 'date' && value.value) {
                        value = new Date(value.value);
                    }
                }
                saveData[index] = value;
            }
            else {
                hasNull = true;
                nullData[index] = 1;
            }
        }

        let update: any = { $set: saveData };
        if (hasNull) {
            update = { $set: saveData, $unset: nullData };
        }

        let multi: boolean = false;
        if (bd.multi == true) {
            multi = true;
        }
        this.dataDB.collection(bd.collection).update(bd.filter, update, { multi: multi })
            .then(() => res.json({
                success: true
            }))
            .catch(err => {
                res.json(new ErrorModel(
                    `Internal service error.`
                ));
            });
    }

    insertFormData(req, res) {
        let bd: any = req.body;
        let now: any = new Date();

        if (!(bd.data instanceof Array)) {
            let saveData: any = {};

            let insertData: Promise<any>;
            if (!bd.pk) {
                insertData = api.getNextSeq(this.dataDB, bd.collection);
            }
            else {                
                insertData = Promise.resolve();
            }

            insertData
                .then(id => {
                    if (id && bd.pk) {
                        saveData[bd.pk] = id;
                    }

                    for (let i in bd.data) {
                        var d = bd.data[i];
                        if (typeof d == 'object' && d.type == 'date') {
                            if (d.value == '@DATE') {
                                bd.data[i] = new Date();
                            }
                            else {
                                bd.data[i] = new Date(d.value);
                            }
                        }
                    }
                    return this.dataDB.collection(bd.collection).insert(Object.assign(saveData, bd.data));
                })
                .then(() => res.json({
                    success: true,
                    id: saveData[bd.pk]
                }))
                .catch(err => {
                    res.json(new ErrorModel(
                        `Internal service error.`
                    ));
                });
        }
        else {
            for (let data of bd.data) {
                for (let i in data) {
                    var d = data[i];
                    if (d) {
                        if (typeof d == 'object' && d.type == 'date') {
                            if (d.value == '@DATE') {
                                data[i] = new Date();
                            }
                            else {
                                data[i] = new Date(d.value);
                            }
                        }
                    }
                }
            }

            this.dataDB.collection(bd.collection).insertMany(bd.data)
                .then(() => res.json({
                    success: true
                }))
                .catch(err => {
                    res.json(new ErrorModel(
                        `Internal service error.`
                    ));
                });
        }
    }

    _getUrl(url: string) {
        if (/{{.*}}/i.test(url)) {
            let serviceName: string = url.substring(url.indexOf('{{') + 2, url.lastIndexOf('}}'));
            let serviceUrl: string = Config.API[serviceName];
            return url.replace('{{' + serviceName + '}}', serviceUrl);
        }
        return url;
    }

    findMenu(req, res) {
        fs.readFile(Config.DataDir + '/menu.json', 'utf8', (err, data) => {
            if (!err) {
                res.json(JSON.parse(data));
            }
            else {
                res.json({});
            }
        });
    }

    findFormById(req, res) {
        var index = 0;
        var fetchRows = async (rows: any[]) => {
            if (!rows) {
                return;
            }

            for (let r of rows) {
                if (r.cols) {
                    for (let c of r.cols) {
                        if (c.imagePath) {
                            var url = c.imagePath;
                            let serviceName: string = url.substring(url.indexOf('{{') + 2, url.lastIndexOf('}}'));
                            let serviceUrl: string = Config.API[serviceName];
                            c.imagePath = url.replace('{{' + serviceName + '}}', serviceUrl);
                        }
                        if (c.api && c.api.url) {
                            c.api.url = this._getUrl(c.api.url);
                        }

                        if (c.data) {
                            if (c.data.url) {
                                let proxy: any = {
                                    url: `${c.data.url}`,
                                    json: true
                                };
                                if (c.data.headers) {
                                    proxy.headers = c.data.headers
                                }
                                await request.get(proxy)
                                    .then((data) => {
                                        if (c.data.mapping) {
                                            let mappings: string[] = c.data.mapping.split('.');
                                            if (mappings.length > 1) {
                                                for (var i = 0; i < mappings.length; i++) {
                                                    data = data[mappings[i]];
                                                }
                                            }
                                        }
                                        c.data = data;
                                    }).catch(() => {
                                        c.data = [];
                                    });
                            }
                            else if (c.data.query) {
                                await eval(`this.dataDB.collection${c.data.query}`)
                                    .toArray()
                                    .then((data) => {
                                        c.data = data;
                                    })
                                    .catch(() => {
                                        c.data = [];
                                    });
                            }
                            else if (c.data.api && c.data.api.url) {
                                c.data.api.url = this._getUrl(c.data.api.url);
                            }
                        }
                        else if (c.paging) {                            
                            if (c.paging.api && c.paging.api.url) {
                                c.paging.api.url = this._getUrl(c.paging.api.url);
                            }
                        }
                        else {
                            c.id = index++;
                        }
                    }
                }
            }
        };

        var prepareData = (data: any): Promise<any> => {
            if (data.ds && data.ds.length > 0) {
                for (let i of data.ds) {
                    if (i.api && i.api.url) {
                        i.api.url = this._getUrl(i.api.url);
                    }
                }
            }

            if (data.save) {
                if (data.save.insert && data.save.insert.length > 0) {
                    for (let i of data.save.insert) {
                        if (i.api && i.api.url) {
                            i.api.url = this._getUrl(i.api.url);
                        }
                    }
                }
                if (data.save.update && data.save.update.length > 0) {
                    for (let i of data.save.update) {
                        if (i.api && i.api.url) {
                            i.api.url = this._getUrl(i.api.url);
                        }
                    }
                }
            }

            var formData = data.data;
            var index = 0;
            return new Promise(async (success, error) => {
                for (let i of formData) {
                    if (i.container) {
                        for (let con of i.container) {
                            if (con.rows && con.rows.length > 0) {
                                await fetchRows(con.rows);
                            }
                            else if (con.fieldset) {
                                await fetchRows(con.fieldset.rows);
                            }
                            else if (con.tab && con.tab.items && con.tab.items.length > 0) {
                                for (let t of con.tab.items) {
                                    if (t.container) {
                                        for (let tcon of t.container) {
                                            if (tcon.rows && tcon.rows.length) {
                                                await fetchRows(tcon.rows);
                                            }
                                            else if (tcon.fieldset) {
                                                await fetchRows(tcon.fieldset.rows);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                success(data);
            });
        }

        fs.readFile(Config.DataDir + '/forms/' + req.params.id + '.json', 'utf8', (err, data) => {
            if (!err) {
                prepareData(JSON.parse(data))
                    .then(resultData => {
                        fs.exists(Config.DataDir + '/scripts/' + req.params.id + '.js', (exists: boolean) => {
                            resultData.script = exists;
                            res.json(resultData);
                        });

                    })
                    .catch(err => {
                        res.json(err);
                    });
            }
            else {
                res.json(new ErrorModel(t.translate('form_not_found', req.query.lang)));
            }
        });

        // this.forms.find({ id: +req.params.id })
        //     .toArray()
        //     .then((data: any) => {
        //         if (data.length > 0) {
        //             return prepareData(data[0]);
        //         }
        //         else {
        //             res.json(new ErrorModel(t.translate('form_not_found', req.query.lang)));
        //         }
        //     })
        //     .then(data => {
        //         res.json(data);
        //     });
    }
}
import * as mongodb from 'mongodb';
import * as express from 'express';
import * as request from 'request-promise';

import * as api from '../base-api';
import { Translation as t } from '../translate/translation';

import { Config } from '../config';
import { FormModel } from '../models/form.model';
import { ErrorModel } from '../models/error.model';

export class FormApi {
    private forms: mongodb.Collection;
    private ncDB: mongodb.Db;
    private dataDB: mongodb.Db;

    constructor(ncDB: mongodb.Db, dataDB: mongodb.Db, app: express.Express) {
        this.ncDB = ncDB;
        this.dataDB = dataDB;

        this.forms = ncDB.collection('forms');

        app.get('/forms/:id', (req, res) => {
            this.findFormById(req, res);
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
        for (let i of bd.data) {            
            if (i.type == 'date') {
                if (i.sysDate) {
                    i.value = new Date();
                }
                else if (i.value != null) {
                    i.value = new Date(i.value);
                }
            }

            if (i.value != null) {
                if (i.type == 'currency') {
                    i.value = mongodb.Decimal128.fromString(i.value.toString());
                }
                saveData[i.field] = i.value;
            }
            else {
                hasNull = true;
                nullData[i.field] = 1;
            }
        }
        let update: any = { $set: saveData };
        if (hasNull) {
            update = { $set: saveData, $unset: nullData };
        }
        this.dataDB.collection(bd.collection).update(bd.filter, update)
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

        let saveData: any = {};
        api.getNextSeq(this.dataDB, bd.collection)
            .then(id => {
                saveData[bd.pk] = id;
                for (let i of bd.data) {
                    if (i.type == 'date') {
                        if (i.sysDate) {
                            i.value = new Date();
                        }
                        else if (i.value != null) {
                            i.value = new Date(i.value);
                        }
                    }

                    if (i.value != null) {
                        if (i.type == 'currency') {
                            i.value = mongodb.Decimal128.fromString(i.value.toString());
                        }
                        saveData[i.field] = i.value;
                    }
                }
                return this.dataDB.collection(bd.collection).insert(saveData);
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

    findFormById(req, res) {
        var index = 0;
        var fetchRows = async (rows: any[]) => {
            if (!rows) {
                return;
            }

            for (let r of rows) {
                if (r.cols) {
                    for (let c of r.cols) {
                        if (c.data) {
                            if (c.data.url) {
                                await request.get({
                                    url: `${c.data.url}`,
                                    json: true
                                })
                                    .then((data) => {
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
                        }
                        else {
                            c.id = index++;
                        }
                    }
                }
            }
        };

        var prepareData = (data: any): Promise<any> => {
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

        this.forms.find({ id: +req.params.id })
            .toArray()
            .then(data => {
                if (data.length > 0) {
                    return prepareData(data[0]);
                }
                else {
                    res.json(new ErrorModel(t.translate('form_not_found', req.query.lang)));
                }
            })
            .then(data => {
                res.json(data);
            });
    }
}
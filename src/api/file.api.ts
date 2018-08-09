import * as express from 'express';
import * as mongodb from 'mongodb';
import * as fileUpload from 'express-fileupload';
import * as fs from 'fs';
import readXlsxFile from 'read-excel-file/node';

import * as api from '../base-api';

var Jimp = require("jimp");
const excel = require('node-excel-export');

import { Config } from '../config';

import { ErrorModel } from '../models/error.model';

export class FileApi {
    private dataDB: mongodb.Db;

    constructor(dataDB: mongodb.Db, app: express.Express) {
        this.dataDB = dataDB;

        app.post('/upload/pictures', (req, res) => {
            this.uploadPicture(req, res);
        });

        app.post('/read-excel', (req, res) => {
            this.readExcel(req, res);
        });

        app.post('/export-excel', (req, res) => {
            this.exportExcel(req, res);
        });

        app.get('/js/:id', (req, res) => {
            this.getFormScript(req, res);
        });
    }

    private getFiles(files: (fileUpload.UploadedFile | fileUpload.UploadedFile[])): fileUpload.UploadedFile[] {
        let f: fileUpload.UploadedFile[] = [];
        if (files.constructor === Array) {
            f = (<fileUpload.UploadedFile[]>files);
        }
        else {
            f.push((<fileUpload.UploadedFile>files));
        }
        return f;
    }

    private upload(files: fileUpload.UploadedFile[], dir: string, resize: boolean = false): Promise<any> {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }

        let names: string[] = [];
        return new Promise((resolve, reject) => {
            let upload = (index: number) => {
                let i: fileUpload.UploadedFile = files[index];
                if (files[index]) {
                    let fileName = api.generateFileName(i.name);
                    i.mv(dir + '/' + fileName, (err) => {
                        if (err) {
                            reject(err);
                        }
                        names.push('/' + fileName);

                        if (resize) {
                            Jimp.read(dir + '/' + fileName, function (err, image) {
                                image.scaleToFit(200, Jimp.AUTO, Jimp.RESIZE_BEZIER).write(dir + '/t/' + fileName);
                                upload(index + 1);
                            });
                        }
                        else {
                            upload(index + 1);
                        }
                    });
                }
                else {
                    resolve(names);
                }
            }
            upload(0);
        });
    }

    getFormScript(req, res) {
        var filePath = Config.DataDir + '/scripts/' + req.params.id + '.js';
        var stat = fs.statSync(filePath);

        res.writeHead(200, {
            'Content-Type': 'text/javascript',
            'Content-Length': stat.size
        });

        var readStream = fs.createReadStream(filePath);
        readStream.pipe(res);
    }

    uploadPicture(req, res) {
        let fileDir = Config.FileDir + '/forms';
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir);
        }

        let dir: string = fileDir;
        let files: fileUpload.UploadedFile[] = this.getFiles(req.files.pictures);
        this.upload(files, dir, true)
            .then(data => {
                res.json(data.map(o => '/forms' + o));
            });
    }

    exportExcel(req, res) {
        let bd: any = JSON.parse(req.body.data);
        console.log(bd);

        if (bd.find) {
            while (bd.find.indexOf('"ISODate') > -1) {
                bd.find = bd.find.replace('"ISODate', 'new Date').replace(')"', ')');
            }
        }

        let queryExpr: string = `this.dataDB.collection('${bd.collection}').find(${bd.find}, { _id: 0 })`;
        eval(queryExpr)
            .toArray()
            .then(data => {
                console.log(data);

                const styles = {
                    headerDark: {
                        font: {
                            bold: true
                        }
                    }
                };

                const specification = {
                    customer_name: {
                        displayName: 'Customer',
                        headerStyle: styles.headerDark,
                        width: 120
                    },
                    status_id: {
                        displayName: 'Status',
                        headerStyle: styles.headerDark,
                        cellFormat: function (value, row) {
                            return (value == 1) ? 'Active' : 'Inactive';
                        },
                        width: '10'
                    },
                    note: {
                        displayName: 'Description',
                        headerStyle: styles.headerDark,
                        width: 220
                    }
                }

                const dataset = [
                    { customer_name: 'IBM', status_id: 1, note: 'some note', misc: 'not shown' },
                    { customer_name: 'HP', status_id: 0, note: 'some note' },
                    { customer_name: 'MS', status_id: 0, note: 'some note', misc: 'not shown' }
                ]

                const report = excel.buildExport(
                    [
                        {
                            specification: specification,
                            data: dataset
                        }
                    ]
                );

                res.attachment('report.xlsx');
                res.send(report);
            });
    }

    readExcel(req, res) {
        let fileDir = Config.FileDir + '/temp';
        if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir);
        }

        let files: fileUpload.UploadedFile[] = this.getFiles(req.files.files);

        let dir: string = fileDir;
        this.upload(files, dir)
            .then(data => {
                readXlsxFile(fileDir + data[0])
                    .then((rows) => {
                        fs.unlink(fileDir + data[0], (err) => {
                            if (err) throw err;
                        });

                        let struct: any = JSON.parse(req.body.data);
                        let rowIndex: number = struct.rowIndex || 0;
                        let columns: any[] = rows[rowIndex];
                        let startRow: number = rowIndex + 1;

                        let columnMatching: any[] = [];
                        for (let c of struct.columns) {
                            let index: number = columns.indexOf(c.text);
                            if (index > -1) {
                                columnMatching.push({
                                    index: index,
                                    name: c.name
                                });
                            }
                        }

                        if (columnMatching.length == 0) {
                            res.json(new ErrorModel('Column not found'));
                        }
                        else {
                            let resultData: any[] = [];
                            for (var i = startRow; i < rows.length; i++) {
                                let row: any = {};
                                for (let c of columnMatching) {
                                    row[c.name] = rows[i][c.index];
                                }
                                resultData.push(row);
                            }
                            res.json(resultData);
                        }
                    })
                    .catch(err => {
                        fs.unlink(fileDir + data[0], (err) => {
                            if (err) throw err;
                        });
                        res.json(err);
                    });
            })
            .catch(data => {
                res.json(data);
            });

        // parseXlsx(files[0])
        //     .then((data) => {
        //         res.json(data);
        //     })
        //     .catch(err => {
        //         res.json(err);
        //     });

        // this.upload(files, dir)
        //     .then(data => {
        //         res.json(data);
        //     });
    }
}
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

    constructor(dataDB: mongodb.Db, router: express.Router) {
        this.dataDB = dataDB;

        router.post('/upload/pictures', (req, res) => {
            this.uploadPicture(req, res);
        });

        router.post('/excel/read', (req, res) => {
            this.readExcel(req, res);
        });

        router.post('/excel/export', (req, res) => {
            this.exportExcel(req, res);
        });

        router.get('/download', (req, res) => {
            this.download(req, res);
        });

        router.get('/js/:id', (req, res) => {
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

    fetchData(bd: any): Promise<any> {
        let resultData: any[] = [];
        let limit: number = 10000;
        if (!bd.aggregate) {
            var promise = this.dataDB.collection(bd.collection).find(bd.find);
            if (bd.sort) {
                promise = promise.sort(bd.sort);
            }

            return promise
                .limit(limit)
                .toArray();
        }
        else {
            let aggList: any[] = [];
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

                aggList.push({
                    $match: bd.find
                });
            }
            if (bd.aggregate) {
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
                                        if (typeof data[i] == 'string' && /!?(@\w+)/i.test(data[i])) {
                                            hasValue = false;
                                        }
                                    }
                                }
                            }
                        }
                        fetch(a);
                    }

                    if (hasValue) {
                        agg.push(a);
                    }
                }
                aggList = aggList.concat(agg);
            }

            var aggFind = aggList;
            if (bd.sort) {
                aggFind.push({
                    $sort: bd.sort
                });
            }

            return this.dataDB.collection(bd.collection).aggregate(aggFind.concat([
                { $limit: limit }
            ])).toArray();
        }
    }

    download(req, res) {
        let filePath = Config.FileDir + req.query.path;
        let fileName = req.query.name;
        var rs = fs.createReadStream(filePath);
        fs.unlink(filePath, (err) => {
            if (err) throw err;

            if (!fileName) {
                fileName = filePath.substring(filePath.lastIndexOf('/') + 1, filePath.length);
            }
            res.attachment(fileName);
            rs.pipe(res);
        });
    }

    exportExcel(req, res) {
        let bd: any = req.body;
        let columns: any = bd.columns;var styles = {
            headerDark: {
                font: {
                    bold: true
                }
            }
        };

        var specification = {};
        for (let c of columns) {
            specification[c.dataIndex] = {
                displayName: c.text,
                headerStyle: styles.headerDark
            };

            if (c.width) {
                specification[c.dataIndex].width = c.width;
            }
        }

        this.fetchData(bd.filter).then(data => {
            for (let i of data) {
                for (let c of columns.filter(o => { return o.mapping; })) {
                    var z = c.dataIndex.split('.');
                    var value;
                    var fetch = function(d, index) {
                        if (d[z[index]] && index < z.length - 1) {
                            fetch(d[z[index]], index + 1);
                        }
                        else {
                            value = d[z[index]];
                        }
                    }
                    fetch(i, 0);
                    i[c.dataIndex] = value;
                }
            }

            var report = excel.buildExport(
                [
                    {
                        specification: specification,
                        data: data
                    }
                ]
            );
            
            var fileName = '/' + api.generateFileName('report.xlsx');
            var filePath = Config.FileDir + fileName;
            fs.writeFile(filePath, report, function (err) {
                if (err) {
                    return console.log(err);
                }

                res.json({
                    path: fileName
                });
            });

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
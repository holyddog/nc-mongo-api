import * as mongodb from 'mongodb';
import * as express from 'express';

export class DocumentFunction {
    private dataDB: mongodb.Db;
    private documentTypes: mongodb.Collection;

    constructor(dataDB: mongodb.Db, router: express.Router) {
        this.dataDB = dataDB;
        this.documentTypes = dataDB.collection('z_document_type');        

        router.get('/fn/document/running/:doc_type', (req, res) => {
            let opts: mongodb.FindOneAndReplaceOption = {
                upsert: true,
                returnOriginal: false
            };
            let coll: mongodb.Collection = dataDB.collection('z_document_type');

            let x = "";
            coll.findOne({ doc_type: +req.params.doc_type })
                .then(data => {
                    var format = data.max_func;

                    var now = new Date();
                    let yy = now.getFullYear().toString().slice(-2);
                    let mm = ("00" + (now.getMonth() + 1)).slice(-2);
                    let dd = ("00" + now.getDate()).slice(-2);
                    
                    x = format.substring(format.indexOf('x'), format.lastIndexOf('x')).replace(/x/ig, 0);
                    format = format.replace('yy', yy).replace('mm', mm).replace('dd', dd).replace(/x/ig, '');

                    if (data.ref != format) {
                        return coll.findOneAndUpdate({ doc_type: +req.params.doc_type }, { $set: { ref: format, seq: 1 } }, opts);
                    }
                    return coll.findOneAndUpdate({ doc_type: +req.params.doc_type, ref: format }, { $inc: { seq: 1 } }, opts);
                })
                .then((data: any) => {
                    return data.value.ref + (x + data.value.seq).slice(-1 * (x.length + 1));
                })
                .then(data => {
                    res.json({
                        doc_no: data
                    });
                })
                .catch(err => { 
                    res.json(err);
                });
        });
    }
}
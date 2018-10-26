import * as mongodb from 'mongodb';
import * as express from 'express';

import { ErrorModel } from '../../../models/error.model';

export class ProductApi {
    private products: mongodb.Collection;

    constructor(db: mongodb.Db, router: express.Router) {
        this.products = db.collection('t_ct_qo');

        router.get('/dbd/categories', (req, res) => {
            this.getProductCategories(req, res);
        });

        router.get('/dbd/products', (req, res) => {
            this.getProducts(req, res);
        });

        router.get('/dbd/products/:id', (req, res) => {
            this.getProductById(req, res);
        });
    }

    getProductCategories(req, res) {
        this.products.aggregate([
            {
                $match: { "qo_sale_chanels.sc_doc_type": 100121, inactive: false }
            },
            {
                $group: {
                    _id: { "id": "$items.ic_id", "name": "$items.ic_name" },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    "_id": 0,
                    "category": "$_id",
                    "count": "$count"
                }
            }
        ])
        .toArray()
        .then((data: any) => {
            res.json(data);
        });
    }

    getProducts(req, res) {
        let filter: any = { 
            qo_sale_chanels: { 
                $elemMatch: { 
                    sc_doc_type: 100121,
                    price_list: { $ne: null }
                }
            },
            inactive: false
        };
        let fields: any = {
            _id: 0,
            seq: 1,
            "items.item_id": 1, 
            "items.item_name": 1, 
            "items.sale_price": 1, 
            "items.sale_cost": 1, 
            "items.item_pic_path": 1,
            "qo_sale_chanels.price_list": 1,
            "qo_sale_chanels.sc_doc_type": 1 
        };

        let limit: number = Math.min(Math.max(0, parseInt(req.query.size)), 250);
        let start: number = Math.max(0, ((parseInt(req.query.page) || 1) - 1) * limit);

        if (req.query.outlet) {
            Object.assign(filter, { outlet_id: +req.query.outlet });
        }
        if (req.query.q) {
            Object.assign(filter, { "items.item_name": { $regex: "^.*" + req.query.q + ".*$", $options: "i" } });
        }
        if (req.query.c) {
            Object.assign(filter, { "items.ic_id": +req.query.c });
        }

        let products: any[] = [];
        return this.products.find(filter, fields)
            .sort({ seq: -1, _id: -1 })
            .skip(start)
            .limit(limit)
            .toArray()
            .then((data: any) => {
                products = data.map(p => {
                    let sc: any = p.qo_sale_chanels.find(o => {
                        return o.sc_doc_type == 100121;
                    });

                    if (sc && sc.price_list.length > 0) {
                        let price: any = sc.price_list[0];
    
                        p.items.sale_cost = price.price;
                    }
                    else {
                        p.items.sale_cost = 0;
                    }

                    delete p.qo_sale_chanels;
                    return p;
                });
                return this.products.count(filter)
            })
            .then(count => {
                res.json({
                    total: count,
                    data: products
                });
            });
    }

    getProductById(req, res) {
        let filters: any = { 
            "items.item_id": +req.params.id,       
            qo_sale_chanels: { 
                $elemMatch: { 
                    sc_doc_type: 100121,
                    price_list: { $ne: null }
                }
            },   
            inactive: false 
        };
        let fields: any = {
            _id: 0,
            doc_id: 1,
            doc_no: 1,
            doc_type: 1,
            outlet_id: 1,
            outlet_name: 1,
            "items.outlet_item_id": 1,
            "items.item_id": 1, 
            "items.item_name": 1, 
            "items.item_desc": 1,
            "items.sale_price": 1, 
            "items.sale_cost": 1, 
            "items.item_pic_path": 1, 
            "items.item_pics_path": 1,
            "items.s_delivery_day": 1,
            "items.e_delivery_day": 1,
            "items.ic_id": 1,
            "items.ic_name": 1,
            "items.ig_id": 1,
            "items.ig_name": 1,
            "items.isg_id": 1,
            "items.isg_name": 1,
            "items.unit_id": 1,
            "items.unit_name": 1,
            "items.barcode": 1,
            "qo_sale_chanels.price_list": 1,
            "qo_sale_chanels.sc_doc_type": 1         
        };

        this.products.find(filters, fields)
            .toArray()
            .then(data => {
                if (data.length > 0) {                    
                    let sc: any = data[0].qo_sale_chanels.find(o => {
                        return o.sc_doc_type == 100121;
                    });

                    if (sc && sc.price_list.length > 0) {
                        let price: any = sc.price_list[0];
    
                        data[0].items.sale_cost = price.price;
                        data[0].items.min_sale_qty = price.s_qty || 1;
                        data[0].items.max_sale_qty = price.e_qty || 1;
                    }
                    else {
                        data[0].items.sale_cost = 0;
                    }

                    res.json(data[0]);
                }
                else {
                    res.json(new ErrorModel(
                        `Product not found.`
                    ));
                }
            })
            .catch(err => {
                res.json(err);
            });
    }
}
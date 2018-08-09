import * as mongodb from 'mongodb';
import * as express from 'express';

import * as api from '../../../base-api';

export class BookingApi {
    private db: mongodb.Db;
    private bookings: mongodb.Collection;
    private sliders: mongodb.Collection;

    constructor(db: mongodb.Db, app: express.Express) {
        this.db = db;

        this.bookings = db.collection('t_e_booking');

        app.post('/dbd/bookings', (req, res) => {
            this.addBooking(req, res);
        });
    }

    addBooking(req, res) {
        let bd: any = req.body;

        let now = new Date();
        let data: any = {
            "booking_no": null,
            "wsp_id": +req.query.wsp_id,
            "outlet_id": +req.query.outlet_id,
            "c_date": now,
            "total_qty": bd.totalQty,
            "total_price": bd.totalPrice,
            "checkout": false,
            "items": bd.items
        };
        
        // let yy = now.getFullYear().toString().slice(-2);
        // let mm = ("00" + (now.getMonth() + 1)).slice(-2);
        // let dd = ("00" + now.getDate()).slice(-2);
        // let ref = yy + mm + dd;

        api.runningNo(this.db, 'bookings_no', '')
            .then(no => {
                data.booking_no = no;
                return this.bookings.insertOne(data);
            })
            .then(() => {
                res.json({
                    booking_no: data.booking_no
                });
            })
            .catch(err => {
                res.json(err);
            });
    }
}
a.onLoad = () => {
    a.getCmp('change_status').on('click', () => {
        var cmbStatus = a.getCmp('e_order_status_id');
        a.view.loading = true;

        var store = a.getCmp('gridStatusLog').getStore();
        var logs = [];
        for (var i = 0; i < store.getCount(); i++) {
            var rec = store.getAt(i);
            logs.push({
                value_id: rec.get('value_id'),
                value_name: rec.get('value_name'),
                log_time: {
                    type: 'date',
                    value: rec.get('log_time')
                }
            });
        }

        var newData = {
            value_id: cmbStatus.getValue(),
            value_name: cmbStatus.getRawValue(),
            log_time: {
                type: 'date',
                value: new Date().toISOString()
            }
        };
        logs.push(newData);

        a.dataService.updateData({
            type: 'mongo',
            collection: 't_e_order',
            filter: {
                e_order_id: +a.queryParams['e_order_id']
            },
            params: {
                status_entity: {
                    value_id: cmbStatus.getValue(),
                    value_name: cmbStatus.getRawValue()
                },
                status_log_entity: logs
            }
        }).then(data => {
            a.view.loading = false;
            a.view.alert('ทำการเปลี่ยนแปลงสถานะเสร็จสมบูรณ์').then(() => {
                newData.log_time = new Date(newData.log_time.value);
                store.loadData([newData], true);
            });
        }).catch(data => {
            a.view.loading = false;
        });
    });

    a.getCmp('change_track_status').on('click', () => {
        var cmbStatus = a.getCmp('track_status_id');
        var txtReason = a.getCmp('track_reason');
        var store = a.getCmp('gridStatusTracking').getStore();

        if (!cmbStatus.getValue()) {
            a.view.alert('กรุณาเลือกสถานะ');
            return;
        } else if (!txtReason.getValue()) {
            a.view.alert('กรุณาระบุเหตุผลการติดตาม');
            return;
        }

        var newData = {
            e_order_id: +a.queryParams['e_order_id'],
            status: {
                id: cmbStatus.getValue(),
                name: cmbStatus.getRawValue()
            },
            reason: txtReason.getValue(),
            create_date: {
                type: 'date',
                value: '@DATE'
            },
            create_by: {
                id: a.authen.user.user_id,
                name: a.authen.user.name
            }
        };

        a.view.loading = true;
        a.dataService.insertData({
            type: 'mongo',
            collection: 't_e_order_tracking',
            params: newData
        }).then(data => {
            a.view.loading = false;
            a.view.alert('ทำการติดตามสถานะเสร็จสมบูรณ์').then(() => {
                newData.create_date = new Date();
                store.loadData([newData], true);

                cmbStatus.reset();
                txtReason.reset();
            });
        }).catch(data => {
            a.view.loading = false;
        });
    });
};
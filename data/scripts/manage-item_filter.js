a.onLoad = () => {
    var btnApprove = a.getCmp('btnApprove');
    var btnUnapprove = a.getCmp('btnUnapprove');
    var grid = a.getCmp('gridItems');

    var doApprove = (approve) => {
        var rows = grid.getSelectionModel().getSelected().items;
        var ids = [];
        for (var i = 0; i < rows.length; i++) {
            ids.push(rows[i].get('items').item_id);
        }

        a.view.loading = true;
        a.dataService.updateData({
            type: 'mongo',
            collection: 't_ct_qo',
            multi: true,
            filter: {
                "items.item_id": { $in: ids }
            },
            params: {
                approved: approve
            }
        }).then(data => {
            a.view.loading = false;

            var msg = 'ทำการอนุมัตสินค้าจำนวน ' + ids.length + ' รายการเสร็จสมบูรณ์';
            if (!approve) {
                msg = 'ทำการยกเลิกอนุมัตสินค้าจำนวน ' + ids.length + ' รายการนี้เสร็จสมบูรณ์';
            }

            a.view.alert(msg).then(() => {
                grid.getStore().load();
            });
        }).catch(data => {
            a.view.loading = false;
        });
    };

    btnApprove.on('click', () => {
        doApprove(true);
    });

    btnUnapprove.on('click', () => {
        doApprove(false);
    });
};
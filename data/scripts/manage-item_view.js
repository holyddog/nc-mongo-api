a.onLoad = () => {
    var btnApprove = a.getCmp('tbarApprove');
    var btnUnapprove = a.getCmp('tbarUnapprove');

    if (a.dsData['ItemData'].approved) {
        btnApprove.hide();
    } else {
        btnUnapprove.hide();
    }

    var doApprove = (approve) => {
        a.view.loading = true;
        a.dataService.updateData({
            type: 'mongo',
            collection: 't_ct_qo',
            filter: {
                "items.item_id": +a.queryParams['item_id']
            },
            params: {
                approved: approve
            }
        }).then(data => {
            a.view.loading = false;

            var msg = 'ทำการอนุมัตสินค้ารายการนี้เสร็จสมบูรณ์';
            if (!approve) {
                msg = 'ทำการยกเลิกอนุมัตสินค้ารายการนี้เสร็จสมบูรณ์';
            }

            a.view.alert(msg).then(() => {
                a.getCmp('gridItems', 'manage-item_filter').getStore().load();
                a.view.closeDialog();
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
a.onLoad = () => {
    a.getCmp('tbarApprove').on('click', () => {
        a.view.loading = true;
        a.dataService.updateData({
            type: 'mongo',
            collection: 't_ct_qo',
            filter: {
                "items.item_id": +a.queryParams['item_id']
            },
            params: {
                approved: true
            }
        }).then(data => {
            a.view.loading = false;
            a.view.alert('ทำการอนุมัตสินค้ารายการนี้เสร็จสมบูรณ์').then(() => {
                a.view.closeDialog();
            });
        }).catch(data => {
            a.view.loading = false;
        });
    });
};
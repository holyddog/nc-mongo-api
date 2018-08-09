a.onLoad = () => {};

a.onBeforeSave = (done) => {
    var randomString = function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890123456789";

        for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }

    var wsp_id = a.getCmp('wsp').getValue();

    a.dataService
        .fetchData({
            "query": "('z_province').find({}, { province_id: 1, province_name: 1 })"
        })
        .then(provinces => {
            var data = [];
            var store = a.getCmp('gridSup').getStore();
            for (var i = 0; i < store.getCount(); i++) {
                var rec = store.getAt(i);
                var province = provinces.find(p => {
                    return p.province_name.indexOf(rec.get('Province')) > -1;
                });

                var row = {
                    outlet_name: rec.get('OutletName'),
                    outlet_desc: rec.get('Description'),
                    regis_key: randomString(8),
                    wsp_id: wsp_id,
                    activated: 0,
                    province_id: null,
                    province_name: rec.get('Province'),
                    regis_date: '@DATE'
                };
                if (province) {
                    row.province_id = province.province_id;
                }
                data.push(row);
            }
            a.saveData[0].params = data;
            console.log('before save', a.saveData);
            done();
        });
};
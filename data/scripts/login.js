a.onLoad = () => {
    a.getCmp('btnLogin').on('click', () => {
        a.app.loading = true;

        var username = a.getCmp('username').getValue();
        var password = a.getCmp('password').getValue();
        a.authen.logIn(username, password).then(data => {
            a.app.loading = false;

            if (data.ErrorCode == 1) {
                a.authen.user = data.Data.User[0];
                a.authen.user.role = "admin";
                a.storage.set('user', a.authen.user);
                a.storage.set('access_token', data.Data.AutenKey);
                a.router.navigate(['/']);
            } else {
                a.view.alert(data.ErrorDetail, data.Title);
            }
        }).catch(data => {
            a.app.loading = false;
        });
    });
};
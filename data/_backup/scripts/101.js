a.onLoad = () => {
    console.log('load', {
        formId: a.formId,
        title: a.title
    });
}

a.onBeforeSave = (done) => {
    console.log('before save', a.saveData);
    done();
};

a.onAfterSave = (done) => {
    console.log('after save', a.resultData);
    done();
};
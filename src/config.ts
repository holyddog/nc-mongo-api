export const Config = {
    MongoUri: 'mongodb://localhost:27017/ecv-dev', 

    // MSSQL: {
    //     user: 'sa',
    //     password: 'whitedog',
    //     server: 'HOLYDOG5\\HOLYDOG5',
    //     database: 'CAPOS_BR_DEV'
    // },

    API: {
        ECV_UAT: 'http://203.154.51.244/dev/SP-OnlineService',
        REPORT_URL: 'http://203.154.51.244/dev/ReportManager',
        IMAGE_PATH: 'http://27.254.138.120:3207/files'
    },
    
    FilePath: '/files',

    DataDir: 'E:/Workspace/Me/New NC/nc-mongo-api/data',
    FileDir: 'E:/Workspace/Me/New NC/nc-mongo-api/public',
    LogDir: 'E:/Workspace/Me/New NC/nc-mongo-api/log',

    AppName: 'NC Mongo API',

    Version: {
        base: 0,
        major: 0,
        minor: 2
    }
};
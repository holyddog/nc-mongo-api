export const Config = {
    MongoUri: 'mongodb://localhost:27017/ECV_DEV', 

    // MSSQL: {
    //     user: 'sa',
    //     password: 'whitedog',
    //     server: 'HOLYDOG5\\HOLYDOG5',
    //     database: 'CAPOS_BR_DEV'
    // },

    API: {
        ECV_UAT: 'http://27.254.138.120:3201/dev/ecv/POS-OnlineService',
        IMAGE_PATH: 'http://27.254.138.120:3207/files'
    },
    
    Port: 3000,
    FilePath: '/files',

    DataDir: 'F:/Workspace/Node.js/nc-mongo-api/data',
    FileDir: 'F:/Workspace/Node.js/nc-mongo-api/public',
    LogDir: 'F:/Workspace/Node.js/nc-mongo-api/log',

    AppName: 'NC Mongo API',

    Version: {
        base: 0,
        major: 0,
        minor: 2
    }
};
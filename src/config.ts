export const Config = {
    MongoUri: 'mongodb://localhost:27017/nc-mongo',
    MongoDataUri: 'mongodb://localhost:27017/nc-mongo-data',    
    MSSQL: {
        user: 'sa',
        password: 'whitedog',
        server: 'HOLYDOG5\\HOLYDOG5',
        database: 'CAPOS_BR_DEV'
    },
    API: {
        // ECV_UAT: 'http://27.254.138.120:3201/uat/ecv'
        ECV_UAT: 'http://27.254.138.120:3201/eComVille/POS-OnlineService'
    },
    
    Host: 'http://localhost',
    Port: 3000,
    FilePath: '/files',
    ImagePath: 'http://27.254.138.120:3203/files',

    FileDir: 'F:/Workspace/Node.js/nc-mongo-api/public',
    LogDir: 'F:/Workspace/Node.js/nc-mongo-api/log',

    AppName: 'NC Mongo API',

    Version: {
        base: 0,
        major: 0,
        minor: 1
    }
};
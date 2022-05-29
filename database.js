const InfiniteDB = require('infinitedb')

const HOST = {
    hostname: 'infinitedb',
    port: '8080'
}

const DATABASE_NAME = 'mesh'

const USER_TABLE = 'users'
const SESSION_TABLE = 'sessions'

const CDN_TABLE = 'cdn'
const CDN_FIELDS = {
    id: {
        type: "text",
        indexed: true,
        unique: true
    },
    load: {
        type: "number",
        indexed: true
    }
}

const IMAGE_TABLE = 'images'
const IMAGE_FIELDS = {
    user: {
        type: "text",
        indexed: true
    },
    image: {
        type: "text",
        indexed: true,
        unique: true
    },
    cdn: {
        type: "text"
    }
}

const PERMISSION_TABLE = 'permissions'

module.exports = class Database {
    constructor(cdnId) {
        this.database = new InfiniteDB(HOST, DATABASE_NAME)

        this.cdnId = cdnId
    }

    async connect() {
        await this.database.connect()

        try{
            await this.database.createTableInDatabase(IMAGE_TABLE, IMAGE_FIELDS)
            console.log('Created image table')
        }catch (e) {
            console.log('Could not create image table')
        }

        try{
            await this.database.createTableInDatabase(CDN_TABLE, CDN_FIELDS)
            console.log('Created cdn table')
        }catch (e) {
            console.log('Could not create cdn table')
        }

        try{
            await this.database.insertToDatabaseTable(CDN_TABLE, {id: this.cdnId, load: 0})
        }catch (e) {
            console.log(e)
        }
    }

    async insertImage(user, image, cdn){
        await this.database.insertToDatabaseTable(IMAGE_TABLE, {user: user, image: image, cdn: cdn})
    }

    async updateLoad(load){
        await this.database.updateInDatabaseTable(CDN_TABLE, {id: this.cdnId, load: load})
    }

    async getSession(id) {
        let where = {
            field: 'id',
            operator: '=',
            value: id
        }

        let implement = [
            {
                from: {
                    table: USER_TABLE,
                    field: 'id'
                },
                field: 'user',
                as: 'user'
            }
        ]

        let session = (await this.database.getFromDatabaseTable(SESSION_TABLE, {where: where, implement: implement}))[0]

        if(session && session.user){
            session.user.password = undefined
            return session
        }else{
            throw 'Invalid session'
        }
    }

    async getPermission(user, permission){
        let where = {
            field: 'user',
            operator: '=',
            value: user,
            and: {
                field: 'permission',
                operator: '=',
                value: permission
            }
        }

        return (await this.database.getFromDatabaseTable(PERMISSION_TABLE, {where: where}))[0]
    }
}
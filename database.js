const InfiniteDB = require('infinitedb')

const HOST = {
    hostname: 'infinitedb',
    port: '6677'
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

module.exports = class Database {
    constructor(cdnId) {
        this.database = new InfiniteDB(HOST, DATABASE_NAME)

        this.cdnId = cdnId
    }

    async connect() {
        await this.database.connect()

        try{
            await this.database.createTable(IMAGE_TABLE, IMAGE_FIELDS)
            console.log('Created image table')
        }catch (e) {
            console.log('Could not create image table')
        }

        try{
            await this.database.createTable(CDN_TABLE, CDN_FIELDS)
            console.log('Created cdn table')
        }catch (e) {
            console.log('Could not create cdn table')
        }

        try{
            await this.database.insert(CDN_TABLE, {id: this.cdnId, load: 0})
        }catch (e) {
            console.log(e)
        }
    }

    async insertImage(user, image, cdn){
        await this.database.insert(IMAGE_TABLE, {user: user, image: image, cdn: cdn})
    }

    async updateLoad(load){
        await this.database.update(CDN_TABLE, {id: this.cdnId, load: load})
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

        let session = (await this.database.query(SESSION_TABLE, {where: where, implement: implement}))[0]

        if(session && session.user){
            session.user.password = undefined
            return session
        }else{
            throw 'Invalid session'
        }
    }

}
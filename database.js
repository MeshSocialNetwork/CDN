const InfiniteDB = require('infinitedb')

const HOST = {
    hostname: 'infinitedb',
    port: '6677'
}

const DATABASE_NAME = 'mesh'

const USER_TABLE = 'users'
const SESSION_TABLE = 'sessions'

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
    constructor() {
        this.database = new InfiniteDB(HOST, DATABASE_NAME)
    }

    async connect() {
        await this.database.connect()

        try{
            await this.database.createTable(IMAGE_TABLE, IMAGE_FIELDS)
            console.log('Created image table')
        }catch (e) {
            console.log('Could not create image table')
        }
    }

    async insertImage(user, image, cdn){
        await this.database.insert(IMAGE_TABLE, {user: user, image: image, cdn: cdn})
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
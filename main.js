const config = require('./config.json')

const Database = require('./database.js')
const Api = require('./api.js')
const Load = require('./load.js')

const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require("cookie-parser")
const busboy = require('connect-busboy')

const API_PREFIX = `/api/cdn/${config.cdnId}`
const PORT = 80

let database = new Database(config.cdnId)

database.connect().then(() => {
    console.log('Connected to database')

    let api = new Api(database, config)
    let load = new Load(database)

    const app = express()
    app.use(bodyParser.json({limit: '50mb'}))
    app.use(cookieParser())
    app.use(busboy())

    app.get(API_PREFIX + '/', ((req, res) => {
        res.status(418).send('Hello world')
    }))

    app.get(API_PREFIX + '/image/:id', (req, res) => {
        load.increaseCount()
        api.getImage(req, res)
    })

    app.post(API_PREFIX + '/image', (req, res) => {
        load.increaseCount()
        api.uploadImage(req, res)
    })

    app.listen(PORT, () => {
        console.log('Server started on port ' + PORT)
    })
})
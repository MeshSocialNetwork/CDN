const fs = require('fs')
const {v4: uuidv4} = require('uuid')
const webp = require('webp-converter')
const {fileTypeFromFile} = require('file-type')
const imageThumbnail = require('image-thumbnail')
const Permission = require('./permission.js')

const CONTENT_DIR = '/static/content/';
const THUMBNAIL_DIR = '/static/thumbnails/'
const TEMP_DIR = '/tmp/';

module.exports = class Api {
    constructor(database, config) {
        this.database = database
        this.config = config
        this.permission = new Permission(this.database)
    }

    async get(req, res) {
        let imageId = req.params.id

        if (!imageId) {
            res.status(400).send({message: 'No id'})
        } else {
            let path = CONTENT_DIR + imageId

            try {
                if (fs.existsSync(path)) {
                    let range = req.headers.range

                    Api.#sendImage(res, range, path)
                } else {
                    res.status(404).send({message: 'Not found'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async getThumbnail(req, res) {
        let imageId = req.params.id

        if (!imageId) {
            res.status(400).send({message: 'No imageId'})
        } else {
            let path = CONTENT_DIR + imageId

            try{
                if (fs.existsSync(path)) {
                    let thumbnailPath = THUMBNAIL_DIR + '_thumbnail-' + imageId

                    let range = req.headers.range

                    if(fs.existsSync(thumbnailPath)){
                        Api.#sendImage(res, range, thumbnailPath)
                    }else{
                        let thumbnail = await imageThumbnail(path, { percentage: 25, responseType: 'buffer'})

                        fs.writeFile(thumbnailPath, thumbnail, (e) => {
                            if(e){
                                res.status(500).send({message: 'Failed to save thumbnail'})
                                console.log(e)
                            }else{
                                Api.#sendImage(res, range, thumbnailPath)
                            }
                        })
                    }
                }else{
                    res.status(404).send({message: 'Image not found'})
                }
            }catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async uploadImage(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            try{
                if(await this.permission.uploadImage(session.user.id)){
                    req.busboy.on('file', (_, file) => {
                        const tempId = uuidv4()

                        try {
                            let writeStream = fs.createWriteStream(TEMP_DIR + tempId)
                            file.pipe(writeStream)

                            writeStream.on('close', () => {
                                const imageId = uuidv4() + '.webp'

                                webp.cwebp(TEMP_DIR + tempId, CONTENT_DIR + imageId, '-q 80').then((response) => {
                                    if(!response){
                                        this.database.insertImage(session.user.id, imageId, this.config.cdnId).then(() => {
                                            res.send({message: 'Image uploaded', imageId: imageId, cdnId: this.config.cdnId})
                                        }).catch(e => {
                                            res.status(500).send({message: 'Internal server error'})
                                            console.log(e)
                                        })
                                    }else{
                                        res.status(400).send({message: 'Unsupported filetype'})
                                    }
                                }).catch((e) => {
                                    res.status(500).send({message: 'Internal server error'})
                                    console.log(e)
                                })
                            })
                        } catch (e) {
                            res.status(500).send({message: 'Internal server error'})
                            console.log(e)
                        }
                    })

                    req.busboy.on('field', () => {
                        res.status(400).send({message: 'Did not understand form'})
                    })

                    req.pipe(req.busboy)
                }else{
                    res.status(401).send({message: 'No permission to upload image'})
                }
            }catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async uploadAnimated(req, res){
        let session = await this.#checkSession(req, res)

        if (session) {
            try{
                if(await this.permission.uploadImage(session.user.id)){
                    req.busboy.on('file', (_, file) => {
                        const tempId = uuidv4()

                        try {
                            let writeStream = fs.createWriteStream(TEMP_DIR + tempId)
                            file.pipe(writeStream)

                            writeStream.on('close', () => {
                                fileTypeFromFile(TEMP_DIR + tempId).then((type) => {
                                    if(type.mime === 'image/gif'){
                                        const imageId = uuidv4() + '.gif'

                                        fs.copyFile(TEMP_DIR + tempId, CONTENT_DIR + imageId, (err) => {
                                            if(err){
                                                res.status(500).send({message: 'Internal server error'})
                                                console.log(err)
                                            }else{
                                                this.database.insertImage(session.user.id, imageId, this.config.cdnId).then(() => {
                                                    res.send({message: 'Animated uploaded', imageId: imageId, cdnId: this.config.cdnId})
                                                }).catch(e => {
                                                    res.status(500).send({message: 'Internal server error'})
                                                    console.log(e)
                                                })
                                            }
                                        })
                                    }else{
                                        res.status(400).send({message: 'Unsupported filetype'})
                                    }
                                }).catch((e) => {
                                    res.status(500).send({message: 'Internal server error'})
                                    console.log(e)
                                })
                            })
                        } catch (e) {
                            res.status(500).send({message: 'Internal server error'})
                            console.log(e)
                        }
                    })

                    req.busboy.on('field', () => {
                        res.status(400).send({message: 'Did not understand form'})
                    })

                    req.pipe(req.busboy)
                }else{
                    res.status(401).send({message: 'No permission to upload image'})
                }
            }catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    static #sendImage(res, range, path){
        const stat = fs.statSync(path)
        const fileSize = stat.size

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize - 1

            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(path, {start, end})

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'image/webp',
            }

            res.writeHead(206, head)
            file.pipe(res)
        } else {
            const header = {
                'Content-Length': fileSize,
                'Content-Type': 'image/webp'
            }

            res.writeHead(200, header)
            fs.createReadStream(path).pipe(res)
        }
    }

    async #checkSession(req, res) {
        const sessionId = req.cookies.session

        if (sessionId) {
            try {
                const session = await this.database.getSession(sessionId)

                if (session) {
                    if (session.user) {
                        if(session.user.emailVerified){
                            return session
                        }else{
                            res.status(400).send({message: 'Email not verified'})
                        }
                    } else {
                        res.status(404).send({message: 'User not found'})
                    }
                } else {
                    res.status(401).send({message: 'Invalid session'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        } else {
            res.status(401).send({message: 'Not logged in'})
        }
    }
}
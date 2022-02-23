const fs = require('fs')
const {v4: uuidv4} = require('uuid')
const webp = require('webp-converter')

const CONTENT_DIR = '/static/content/';
const TEMP_DIR = '/tmp/';

module.exports = class Api {
    constructor(database, config) {
        this.database = database
        this.config = config
    }

    async getImage(req, res) {
        let imageId = req.params.id

        if (!imageId) {
            res.status(400).send({message: 'No imageId'})
        } else {
            let path = CONTENT_DIR + imageId

            try {
                if (fs.existsSync(path)) {
                    let range = req.headers.range

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
                } else {
                    res.status(404).send({message: 'Image not found'})
                }
            } catch (e) {
                res.status(500).send({message: 'Internal server error'})
                console.log(e)
            }
        }
    }

    async uploadImage(req, res) {
        let session = await this.#checkSession(req, res)

        if (session) {
            req.pipe(req.busboy)

            req.busboy.on('file', (_, file) => {
                const tempId = uuidv4()

                try {
                    let writeStream = fs.createWriteStream(TEMP_DIR + tempId)
                    file.pipe(writeStream)

                    writeStream.on('close', () => {
                        const imageId = uuidv4() + '.webp'

                        webp.cwebp(TEMP_DIR + tempId, CONTENT_DIR + imageId, '-q 80').then(() => {
                            this.database.insertImage(session.user.id, imageId, this.config.cdnId).then(() => {
                                res.send({message: 'Image uploaded', imageId: imageId, cdnId: this.config.cdnId})
                            }).catch(e => {
                                res.status(500).send({message: 'Internal server error'})
                                console.log(e)
                            })
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
        }
    }

    async #checkSession(req, res) {
        const sessionId = req.cookies.session

        if (sessionId) {
            try {
                const session = await this.database.getSession(sessionId)

                if (session) {
                    if (session.user) {
                        return session
                    } else {
                        res.send(404).send({message: 'User not found'})
                    }
                } else {
                    res.send(401).send({message: 'Invalid session'})
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
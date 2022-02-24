const ADMIN_PERMISSION = 'admin'
const UPLOAD_IMAGE_PERMISSION = 'upload_image'

module.exports = class Permission {
    constructor(database) {
        this.database = database
    }

    async admin(userId) {
        return await this.database.getPermission(userId, ADMIN_PERMISSION)
    }

    async uploadImage(userId) {
        let uploader = await this.database.getPermission(userId, UPLOAD_IMAGE_PERMISSION)

        if(!uploader){
            uploader = await this.admin(userId)
        }

        return uploader
    }
}

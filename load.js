module.exports = class Load{
    constructor(database) {
        this.database = database

        this.load = 0

        this.count = 0
        this.lastmeasurement = Date.now()
    }

    increaseCount(){
        this.count ++

        return this.#checkMeasurement()
    }

    #checkMeasurement(){
        if((Date.now() - this.lastmeasurement) > ((60*1000)*1)){
            this.load = this.count
            this.count = 0
            this.lastmeasurement = Date.now()

            this.#advertiseLoad()

            return true
        }

        return false
    }

    #advertiseLoad(){
        this.database.updateLoad(this.load).then(() => {

        }).catch((e) => {
            console.log('Advertising load failed')
            console.log(e)
        })
    }
}
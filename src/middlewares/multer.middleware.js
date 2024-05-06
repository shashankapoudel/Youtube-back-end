import multer from "multer";


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/temp') //tyo destination ma file lai rakhni
    },
    filename: function (req, file, cb) {


        cb(null, file.originalname) //file ko original name lini
    }
})

export const upload = multer({
    storage,
})
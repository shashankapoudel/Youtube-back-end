// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from './db/index.js';
import { app } from "./app.js";


dotenv.config({
    path: './env'
})


connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port :${process.env.PORT}`);
        })
    }
    )
    .catch((error) => {
        console.log(" MONGO DB connection failed!!!", error);
    })



/* first approach
arko approach eslai db ma index.js banayera use garni
import { Express } from 'express';
const app = express()


   (async () => {

       try {
           mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
           app.on("error", (error) => {
               console.log("error");
               throw error
           }) //listens error event

           app.listen(process.env.PORT, () => {
               console.log(`App is listening on port ${process.env.PORT}`);
           })
       } catch (error) {
           console.log("ERROR", error);
           throw err
       }

   })()
   */
const express = require("express")
const app = express()

const path = require("path")
const fs = require("fs")

const dotenv = require("dotenv")
dotenv.config({path:path.join(__dirname,".env")})

const bodyParser = require("body-parser")
app.use(bodyParser.json())

// Set up EJS
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const mongoose = require("mongoose")
mongoose
  .connect(process.env.DATABASE, {
  })
  .then(() => {
    console.log("Database Connected");
  });

// Serve the download page
app.get('/download', (req, res) => {
    res.render('download');
});

// API routes
app.use("/api/docs",require("./routes/doc"))

const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log("listening at "+PORT)
})

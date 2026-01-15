const express = require("express")
const cors = require("cors")
require("dotenv").config()
const authRoutes = require("./src/routes/authRoutes")
const examRoutes = require("./src//routes/examRoutes")
const questionRoutes = require("./src/routes/questionRoutes")
const app = express()
const PORT = process.env.PORT || 5000

//middlewares 
app.use(cors())
app.use(express.json())  //Parses JSON from frontend
app.use("/api/auth", authRoutes)
app.use("/api/exams", examRoutes)
app.use("/api/questions", questionRoutes)



//routes
app.get("/", (req,res) => {
    res.json({message: "Hello from Test Route!"})
})


app.listen(PORT, () =>{
    console.log(`🚀 Server running on http://localhost:${PORT}`)
})
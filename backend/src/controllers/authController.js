const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const jwt  = require("jsonwebtoken")

const prisma = new PrismaClient()
const SECRET_KEY = process.env.SECRET_KEY || "lnbviuregalriufbcrgegrnvserghy"

//regiser user
exports.register = async(req,res)=> {
    try {
        const { name , email, password , role } = req.body

        // 1.check if user is already exsits
        const existingUser = await prisma.user.findUnique({where: { email }})
        if (existingUser) return res.status(400).json({error:"User already  Exists !" })

        // 2. Hash Password 
        const hashedPassword = await bcrypt.hash(password, 10)
        
        //3.create user in db
        const user = await prisma.user.create({
            data: {name, email, password: hashedPassword,role}
        })

        res.status(201).json({message: "User created Successfully", user })
    }catch(err) {
        res.status(500).json({error: "Registration faied", details: err.message})
    }
}

//Login user 
exports.login = async(req,res)=> {
    try {
        const { email, password } = req.body

        // 1. find user in db
        const user = await prisma.user.findUnique({where: { email }})
        if (!user) return  res.status(404).json({message:"User Not Found !"})

        // 2. check password
        const isValid  = await bcrypt.compare(password , user.password)
        if (!isValid) return res.status(401).json({error: "Invalid PAssword"})

        //3. generate token 
        const token = jwt.sign({ id: user.id, role: user.role}, SECRET_KEY, {expiresIn:"1d"})

        res.json({ message: "Login successful", token, user: { id: user.id, name: user.name, role: user.role } })
    }catch(err) {
        res.status(500).json({error:"Login failed!"})
    }
}
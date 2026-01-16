const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const SECRET_KEY = process.env.SECRET_KEY || "lnbviuregalriufbcrgegrnvserghy";

//regiser user
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1.check if user is already exsits
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ error: "User already  Exists !" });

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    //3.create user in db
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role },
    });

    res.status(201).json({ message: "User created Successfully", user });
  } catch (err) {
    res.status(500).json({ error: "Registration faied", details: err.message });
  }
};

//Login user
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    
    // 📢 SPY LOG 1: What is coming from the frontend?
    console.log("---- LOGIN ATTEMPT ----");
    console.log("📥 Email:", email);
    console.log("📥 Role Requested:", role);

    // 1. Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      console.log("❌ Error: User not found in Database");
      return res.status(400).json({ error: "User not found" });
    }

    // 📢 SPY LOG 2: What is actually in the database?
    console.log("👤 User Found in DB:", user.name);
    console.log("👤 Role in DB:", user.role);

    // 2. SECURITY CHECK: Enforce Role Matching
    if (user.role !== role) {
      console.log(`❌ BLOCKING: User is a '${user.role}' but tried to login as '${role}'`);
      return res.status(403).json({ 
        error: `Access Denied! This account is registered as a ${user.role}, not a ${role}.` 
      });
    }

    // 3. Check Password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      console.log("❌ Error: Wrong Password");
      return res.status(400).json({ error: "Invalid password" });
    }

    // 4. Check JWT Secret (Common Crash Cause)
    if (!process.env.SECRET_KEY) {
      console.log("❌ CRITICAL ERROR: process.env.SECRET_KEY is missing!");
      throw new Error("Server Misconfiguration: No SECRET_KEY");
    }

    // 5. Generate Token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    console.log("✅ Login Successful!");
    res.json({ token, role: user.role, name: user.name });

  } catch (err) {
    console.error("🔥 SERVER CRASH IN LOGIN:", err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
};

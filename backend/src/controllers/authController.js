const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();


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
// Login user
exports.login = async (req, res) => {
  try {
    // 1. Only extract email and password (ignore role from frontend)
    const { email, password } = req.body;

    console.log("---- LOGIN ATTEMPT ----");
    console.log("📥 Email:", email);

    // 2. Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log("❌ Error: User not found");
      return res.status(400).json({ error: "User not found" });
    }

    console.log("👤 User Found in DB:", user.name);
    console.log("👤 Role in DB:", user.role);

    // 3. REMOVED THE ROLE CHECK HERE
    // We trust the database. If the password is correct, we let them in as their stored role.

    // 4. Check Password
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) {
      console.log("❌ Error: Wrong Password");
      return res.status(400).json({ error: "Invalid password" });
    }

    // 5. Check JWT Secret
    if (!process.env.SECRET_KEY) {
      throw new Error("Server Misconfiguration: No SECRET_KEY");
    }

    // 6. Generate Token (Uses the Role from Database)
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    console.log("✅ Login Successful!");

    // Send back the role so the frontend knows where to redirect
    res.json({ token, role: user.role, name: user.name });

  } catch (err) {
    console.error("🔥 SERVER CRASH IN LOGIN:", err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
};
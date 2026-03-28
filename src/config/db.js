const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb+srv://robinparjapatikumar:robinbhai82@cluster0.p2mv0em.mongodb.net/?appName=Cluster0');
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

module.exports = connectDB;
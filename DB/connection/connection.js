import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config()


// Use MONGODB_URI from .env
const cloudURL = process.env.MONGODB_URI;

const connectDB = async () => {
    await mongoose.connect(cloudURL, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
    });
}
export default connectDB


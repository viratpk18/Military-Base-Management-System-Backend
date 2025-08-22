// testDailySummary.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { generateDailySummaries } from '../cron/dailySummaryJob.js';

dotenv.config({ path: '../.env' });

// MongoDB Environment Variables
const dbUserName = process.env.DB_USERNAME;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const dbCluster = process.env.DB_CLUSTER;

const cloudURL = `mongodb+srv://${dbUserName}:${dbPassword}@${dbCluster}/${dbName}?retryWrites=true&w=majority`;

const start = async () => {
  try {
    await mongoose.connect(cloudURL);
    await generateDailySummaries();
    console.log("✅ Done running daily summary");
  } catch (err) {
    console.error("❌ Error running daily summary:", err.message);
  } finally {
    await mongoose.disconnect();
  }
};

start();

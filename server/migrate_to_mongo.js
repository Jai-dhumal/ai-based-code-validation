import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']); // Resolves Windows SRV lookup reliably

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  User,
  Department,
  Subject,
  Assignment,
  Submission,
  QuizPermission,
  VivaSubmission,
  QuizAccessRequest,
  Announcement,
  Notification,
  ActivityLog,
  Setting
} from './models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI is not defined in server/.env');
  process.exit(1);
}

const dbFilePath = path.join(__dirname, 'data', 'database.json');
if (!fs.existsSync(dbFilePath)) {
  console.error(`❌ Data file ${dbFilePath} does not exist`);
  process.exit(1);
}

async function migrate() {
  console.log('🚀 Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Connected to MongoDB Atlas cluster0.bbwixkk.mongodb.net/code_validator');

  const raw = fs.readFileSync(dbFilePath, 'utf8');
  const data = JSON.parse(raw);

  const collections = [
    { name: 'departments', model: Department, list: data.departments || [] },
    { name: 'subjects', model: Subject, list: data.subjects || [] },
    { name: 'users', model: User, list: data.users || [] },
    { name: 'assignments', model: Assignment, list: data.assignments || [] },
    { name: 'submissions', model: Submission, list: data.submissions || [] },
    { name: 'quizPermissions', model: QuizPermission, list: data.quizPermissions || [] },
    { name: 'vivaSubmissions', model: VivaSubmission, list: data.vivaSubmissions || [] },
    { name: 'quizAccessRequests', model: QuizAccessRequest, list: data.quizAccessRequests || [] },
    { name: 'announcements', model: Announcement, list: data.announcements || [] },
    { name: 'notifications', model: Notification, list: data.notifications || [] },
    { name: 'activityLogs', model: ActivityLog, list: data.activityLogs || [] }
  ];

  console.log('\n--- Migrating Collections ---');
  for (const { name, model, list } of collections) {
    let upserted = 0;
    for (const item of list) {
      if (!item.id) continue;
      await model.updateOne({ id: item.id }, { $set: item }, { upsert: true });
      upserted++;
    }
    console.log(`  📦 Collection '${name}': ${upserted} documents synchronized.`);
  }

  // Settings
  if (data.settings) {
    await Setting.updateOne(
      { key: 'global_settings' },
      { $set: { key: 'global_settings', ...data.settings } },
      { upsert: true }
    );
    console.log('  ⚙️  Global settings synchronized.');
  }

  console.log('\n🎉 ALL DATA SUCCESSFULLY MIGRATED TO MONGODB ATLAS!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

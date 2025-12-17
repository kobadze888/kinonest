// scripts/backup-pro.js
import 'dotenv/config';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL არ არის მითითებული .env ფაილში");
    process.exit(1);
}

// კონფიგურაცია
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 2; // შენარჩუნდება მხოლოდ ბოლო 4 ფაილი

// საქაღალდის შექმნა
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR);
}

// ფაილის სახელი თარიღით
const dateStr = new Date().toISOString().split('T')[0];
const fileName = `backup_${dateStr}.sql`;
const filePath = path.join(BACKUP_DIR, fileName);

console.log("🚀 იწყება SQL Dump (სრული ბაზის გადმოწერა)...");

const command = `pg_dump "${process.env.DATABASE_URL}" --clean --if-exists --no-owner --no-acl -f "${filePath}"`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ შეცდომა ბექაფის დროს: ${error.message}`);
        return;
    }

    console.log(`✅ ბექაფი წარმატებით შეიქმნა: ${fileName}`);

    // ძველი ფაილების წაშლის ლოგიკა
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) return console.error("❌ საქაღალდის წაკითხვის შეცდომა");

        // ვფილტრავთ მხოლოდ .sql ფაილებს და ვალაგებთ თარიღით
        const backups = files
            .filter(f => f.startsWith('backup_') && f.endsWith('.sql'))
            .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        // თუ ფაილების რაოდენობა აჭარბებს MAX_BACKUPS-ს, ვშლით უძველესებს
        if (backups.length > MAX_BACKUPS) {
            const filesToDelete = backups.slice(MAX_BACKUPS);
            filesToDelete.forEach(file => {
                fs.unlinkSync(path.join(BACKUP_DIR, file.name));
                console.log(`🗑️ წაიშალა ძველი ბექაფი: ${file.name}`);
            });
        }
    });
});
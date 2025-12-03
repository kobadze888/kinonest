// src/pages/api/admin/run-videoseed.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { exec } from 'child_process';
import path from 'path';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'არაავტორიზებული' });

  // ჩვენ გავუშვებთ სკრიპტს ფონურ რეჟიმში
  const scriptPath = path.join(process.cwd(), 'scripts', 'sync-videoseed.js');
  
  exec(`node ${scriptPath}`, (error, stdout, stderr) => {
      if (error) {
          console.error(`exec error: ${error}`);
          return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
  });

  return res.status(200).json({ message: "სინქრონიზაცია დაიწყო ფონურ რეჟიმში. შეამოწმეთ სერვერის ლოგები." });
}
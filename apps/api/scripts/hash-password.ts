import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usage: npm run hash-password -- "a password of at least 10 characters"');
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
console.log(`ADMIN_PASSWORD_HASH='${hash}'`);

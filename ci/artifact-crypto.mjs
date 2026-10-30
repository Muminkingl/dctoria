import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const key = Buffer.from(process.env.DCTORIA_SOURCE_KEY, 'base64');
if (key.length !== 32) throw new Error('Invalid snapshot key.');
const mode = process.argv[2];
if (mode === 'decrypt') {
  const data = await readFile('ci/dctoria-source.enc');
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  const archive = Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]);
  const target = process.env.DCTORIA_SOURCE_DIR;
  await mkdir(target, {recursive: true});
  const archivePath = path.join(process.env.RUNNER_TEMP, 'dctoria-source.tar.gz');
  await writeFile(archivePath, archive, {mode: 0o600});
  execFileSync('tar', ['-xzf', archivePath, '-C', target]);
} else if (mode === 'encrypt-results') {
  const resultDirectory = path.join(process.env.RUNNER_TEMP, 'dctoria-results');
  await mkdir(resultDirectory, {recursive: true});
  const archivePath = path.join(process.env.RUNNER_TEMP, 'dctoria-results.tar.gz');
  execFileSync('tar', ['-czf', archivePath, '-C', resultDirectory, '.']);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(await readFile(archivePath)), cipher.final()]);
  await writeFile(path.join(process.env.RUNNER_TEMP, 'dctoria-results.enc'),
    Buffer.concat([nonce, cipher.getAuthTag(), encrypted]), {mode: 0o600});
} else throw new Error('Unknown artifact operation.');

#!/usr/bin/env node
// note-publish.js: note.comに記事を下書き保存するPlaywrightスクリプト
//
// 使い方: node scripts/note-publish.js <04_final.mdのパス>
// 環境変数: .envファイルに NOTE_COM_EMAIL / NOTE_COM_PASSWORD を記載
//          PLAYWRIGHT_HEADLESS=false でブラウザを表示（デバッグ用）
//
// 既知の制限:
//   - CAPTCHA / 2FAが有効なアカウントでは自動化不可
//   - note.comのDOM構造変更で動作しなくなる場合がある
//   - セッションクッキーは約30日で期限切れ

const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROMIUM_PATH = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const COOKIE_FILE = path.join(os.homedir(), '.note-com-session.json');
const NOTE_BASE_URL = 'https://note.com';

function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArticle(content) {
  const lines = content.split('\n');
  let title = '';
  for (const line of lines) {
    const m = line.match(/^#\s+(.+)/);
    if (m) { title = m[1].trim(); break; }
  }
  if (!title) title = lines.find(l => l.trim()) || '無題';

  const marker = '【ここから有料パート】';
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) {
    return { title, freeSection: content, paidSection: null };
  }
  const freeSection = content.slice(0, markerIdx).trim();
  const paidSection = content.slice(markerIdx + marker.length).trim();
  return { title, freeSection, paidSection };
}

function loadCookies() {
  if (!fs.existsSync(COOKIE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveCookies(cookies) {
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2), 'utf8');
}

async function pasteText(page, selector, text) {
  const el = page.locator(selector).first();
  await el.click();

  // クリップボード経由でペースト（長文向け）
  try {
    await page.evaluate(async (t) => {
      await navigator.clipboard.writeText(t);
    }, text);
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(500);

    // ペーストが効いたか確認
    const pasted = await el.evaluate(el => el.textContent || el.innerText || '');
    if (pasted.trim().length > 10) return;
  } catch {}

  // フォールバック: execCommand
  await page.evaluate((t) => {
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, t);
  }, text);
  await page.waitForTimeout(300);
}

async function insertPaidDivider(page) {
  // 末尾にカーソルを移動してEnterで空行を作る
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);

  // ガターの「+」ボタンを探してクリック
  try {
    const plusBtn = page.locator('[data-type="slash-menu-trigger"], .c-editor__addButton, button[aria-label*="追加"], button[aria-label*="ブロック"]').first();
    await plusBtn.waitFor({ timeout: 3000 });
    await plusBtn.click();
    await page.waitForTimeout(500);

    // メニューから「有料コンテンツ」を選択
    const paidItem = page.getByText(/有料コンテンツ/).first();
    await paidItem.waitFor({ timeout: 3000 });
    await paidItem.click();
    await page.waitForTimeout(500);
    return true;
  } catch {
    // フォールバック: テキストで代替
    await page.evaluate(() => {
      document.execCommand('insertText', false, '\n【ここから有料パート】\n');
    });
    return false;
  }
}

async function login(page, email, password) {
  await page.goto(`${NOTE_BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('メールアドレス').fill(email);
  await page.getByPlaceholder('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL(/note\.com\/(?!login)/, { timeout: 15000 });
}

async function isLoggedIn(page) {
  try {
    await page.goto(`${NOTE_BASE_URL}/my/notes`, { waitUntil: 'networkidle', timeout: 15000 });
    return !page.url().includes('/login');
  } catch {
    return false;
  }
}

async function main() {
  loadEnv();

  const filePath = process.argv[2];
  if (!filePath) {
    console.error('使い方: node scripts/note-publish.js <04_final.mdのパス>');
    process.exit(1);
  }
  if (!fs.existsSync(filePath)) {
    console.error(`ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }

  const email = process.env.NOTE_COM_EMAIL;
  const password = process.env.NOTE_COM_PASSWORD;
  if (!email || !password) {
    console.error('NOTE_COM_EMAIL または NOTE_COM_PASSWORD が設定されていません。.envファイルを確認してください。');
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const { title, freeSection, paidSection } = parseArticle(content);

  console.error(`タイトル: ${title}`);
  console.error(`無料パート: ${freeSection.length}文字`);
  if (paidSection) console.error(`有料パート: ${paidSection.length}文字`);

  const browser = await chromium.launch({
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
    executablePath: CHROMIUM_PATH,
  });

  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
    locale: 'ja-JP',
  });

  // 保存済みクッキーを読み込む
  const savedCookies = loadCookies();
  if (savedCookies) {
    await context.addCookies(savedCookies);
  }

  const page = await context.newPage();

  try {
    // ログイン確認
    if (!(await isLoggedIn(page))) {
      console.error('ログイン中...');
      await login(page, email, password);
    }

    // クッキーを保存
    saveCookies(await context.cookies());

    // 新規記事作成ページへ
    await page.goto(`${NOTE_BASE_URL}/notes/new`, { waitUntil: 'networkidle' });

    // タイトル入力
    const titleInput = page.getByPlaceholder('タイトル').first();
    await titleInput.waitFor({ timeout: 15000 });
    await titleInput.click();
    await titleInput.fill(title);
    await page.waitForTimeout(300);

    // 本文エディタが起動するのを待つ
    const editor = page.locator('.ProseMirror, [contenteditable="true"]:not([placeholder*="タイトル"])').first();
    await editor.waitFor({ timeout: 15000 });
    await editor.click();

    // 無料パートをペースト
    console.error('無料パートを入力中...');
    await pasteText(page, '.ProseMirror, [contenteditable="true"]:not([placeholder*="タイトル"])', freeSection);

    // 有料区切りを挿入
    if (paidSection) {
      console.error('有料区切りを挿入中...');
      await insertPaidDivider(page);

      // 有料パートをペースト
      console.error('有料パートを入力中...');
      await page.keyboard.press('Enter');
      await page.evaluate((text) => {
        document.execCommand('insertText', false, text);
      }, paidSection);
      await page.waitForTimeout(500);
    }

    // 下書き保存
    console.error('下書きを保存中...');
    const saveBtn = page.getByRole('button', { name: /下書き保存/ }).first();
    await saveBtn.waitFor({ timeout: 10000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // URLを取得
    const draftUrl = page.url();
    console.log(draftUrl);

    await browser.close();
  } catch (err) {
    console.error(`エラー: ${err.message}`);
    await browser.close();
    process.exit(1);
  }
}

main();

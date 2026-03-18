import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import querystring from 'querystring';
import { getDbClient } from './db.js';
// ESM環境でのパス解決用
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const handler = async (event) => {
    // 1. 環境に応じたルートパスの決定（Lambda環境なら /var/task を優先）
    const baseDir = process.env.LAMBDA_TASK_ROOT || __dirname;
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";
    try {
        // --- GET: ログイン画面表示 ---
        if (method === "GET") {
            const templatePath = path.join(baseDir, 'views', 'login.hbs');
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found at ${templatePath}`);
            }
            const source = fs.readFileSync(templatePath, 'utf8');
            // ヘッダー(Partial)の読み込み
            const headerPath = path.join(baseDir, 'views', 'partials', 'header.hbs');
            if (fs.existsSync(headerPath)) {
                Handlebars.registerPartial('header', fs.readFileSync(headerPath, 'utf8'));
            }
            const template = Handlebars.compile(source);
            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
                body: template({ title: "デモ用ログインシステム" })
            };
        }
        // --- POST: ログイン処理 ---
        if (method === "POST") {
            const client = getDbClient();
            await client.connect();
            const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
            const params = querystring.parse(body || '');
            const { username, password } = params;
            const result = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
            await client.end();
            if (result.rows.length > 0) {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                    body: "<h1>✅ Login Success!</h1><p>ようこそ、" + username + "さん</p><a href='./'>戻る</a>"
                };
            }
            else {
                return {
                    statusCode: 401,
                    headers: { "Content-Type": "text/html; charset=utf-8" },
                    body: "<h1>❌ Login Failed</h1><p>ユーザー名またはパスワードが違います。</p><a href='./'>戻る</a>"
                };
            }
        }
    }
    catch (err) {
        console.error("Error occurred:", err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: "Internal Server Error",
                message: err.message,
                debug_path: baseDir
            })
        };
    }
    return { statusCode: 404, body: "Not Found" };
};

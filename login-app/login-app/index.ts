import { Handler } from 'aws-lambda';
import { getDbClient } from './db.js';
import querystring from 'querystring';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

// HTML直書きを消して、ファイルを読み込む処理に変更
const templatePath = path.join(__dirname, 'views', 'login.hbs');
const source = fs.readFileSync(templatePath, 'utf8');
const template = Handlebars.compile(source);
// DynamoDBクライアントの初期化
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: Handler = async (event) => {
    const method = event.requestContext?.http?.method || event.httpMethod || "GET";

    if (method === "GET") {
        const html = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><title>Demo Login</title></head>
            <body style="text-align:center; padding-top:50px; font-family:sans-serif;">
                <h2>Demo System Login</h2>
                <div style="margin-bottom:20px; color:#666;">RDS + DynamoDB Demo</div>
                <form method="POST">
                    <input type="text" name="username" placeholder="User" required><br><br>
                    <input type="password" name="password" placeholder="Pass" required><br><br>
                    <button type="submit" style="padding:10px 30px; background:#007bff; color:white; border:none; border-radius:4px;">Login</button>
                </form>
                <p style="color:#888; font-size:12px; margin-top:20px;">Hint: admin / password123</p>
            </body>
            </html>
        `;
        return {
            statusCode: 200,
            headers: { "Content-Type": "text/html; charset=utf-8" },
            body: html
        };
    }

    if (method === "POST") {
        try {
            const rawBody = event.isBase64Encoded ? Buffer.from(event.body!, 'base64').toString() : event.body;
            const params = querystring.parse(rawBody || '');
            const username = params.username as string;
            const password = params.password as string;

 
            // 2. RDSチェック
            const client = getDbClient();
            await client.connect();
            const result = await client.query(
                'SELECT * FROM users WHERE username = $1 AND password = $2',
                [username, password]
            );
            await client.end();

            if (result.rows && result.rows.length > 0) {
                // 3. DynamoDBにセッションを保存
                const sessionId = "sess_" + Math.random().toString(36).substring(2, 10);
                await docClient.send(new PutCommand({
                    TableName: "sessions", // AWSコンソールのテーブル名と一致させてください
                    Item: {
                        sessionId: sessionId,
                        username: username,
                        loginAt: new Date().toISOString(),
                        ttl: Math.floor(Date.now() / 1000) + 3600 // 1時間で自動削除
                    }
                }));

                return { 
                    statusCode: 200, 
                    headers: {"Content-Type": "text/html; charset=utf-8"}, 
                    body: `
                        <div style="text-align:center; padding-top:50px; font-family:sans-serif;">
                            <h1 style="color:green;">✅ Login Success!</h1>
                            <p>Welcome, <b>${username}</b></p>
                            <div style="background:#f4f4f4; padding:20px; display:inline-block; border-radius:8px;">
                                <p><b>Session stored in DynamoDB:</b></p>
                                <code>${sessionId}</code>
                            </div>
                            <br><br>
                            <a href='./'>ログアウト（戻る）</a>
                        </div>
                    ` 
                };
            } else {
                return { 
                    statusCode: 401, 
                    headers: {"Content-Type": "text/html; charset=utf-8"}, 
                    body: "<h1>❌ Login Failed</h1><p>IDかパスワードが違います</p><a href='./'>戻る</a>" 
                };
            }
        } catch (err: any) {
            console.error(err);
            return { 
                statusCode: 500, 
                headers: {"Content-Type": "text/html; charset=utf-8"}, 
                body: `<h1>⚠️ エラー</h1><p>${err.message}</p><a href='./'>戻る</a>` 
            };
        }
    }
};
import pkg from 'pg';
const { Client } = pkg;
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import fs from 'fs';
import Handlebars from 'handlebars';

// AWS SDKの初期化
const ddbClient = new DynamoDBClient({ region: "ap-northeast-1" });
const docClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event: any) => {
    const { username, password } = typeof event.body === 'string' ? JSON.parse(event.body) : event;

    const client = new Client({
        host: 'YOUR_RDS_ENDPOINT',
        user: 'postgres',
        password: 'password123',
        database: 'postgres',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        
        // 1. RDSでユーザー認証
        const res = await client.query(
            'SELECT username FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (res.rows.length > 0) {
            const user = res.rows[0];
            const sessionId = `sess_${Date.now()}`;

            // 2. DynamoDBにセッション情報を保存（明日以降やる予定の部分を先取り！）
            await docClient.send(new PutCommand({
                TableName: "sessions",
                Item: {
                    sessionId: sessionId,
                    username: user.username,
                    createdAt: Math.floor(Date.now() / 1000)
                }
            }));

            // 3. Handlebarsで画面作成
            const headerSource = fs.readFileSync('./views/header.hbs', 'utf8');
            const template = Handlebars.compile(headerSource);
            const headerHtml = template({ username: user.username });

            return {
                statusCode: 200,
                headers: { "Content-Type": "text/html" },
                body: `${headerHtml}<h2>ログイン成功！</h2><p>セッションID: ${sessionId}</p>`
            };
        } else {
            return { statusCode: 401, body: "Login Failed" };
        }
    } catch (err: any) {
        return { statusCode: 500, body: err.message };
    } finally {
        await client.end();
    }
};
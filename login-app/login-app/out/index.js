import { getDbClient } from './db.js';
export const handler = async (event) => {
    // CORS対応のためのレスポンスヘッダー
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
        "Content-Type": "application/json"
    };
    // プリフライトリクエスト(OPTIONS)対応
    if (event.requestContext?.http?.method === "OPTIONS") {
        return { statusCode: 200, headers };
    }
    try {
        // ローカルHTMLからのJSONを受け取る
        const body = JSON.parse(event.body || '{}');
        const { username, password } = body;
        const client = getDbClient();
        await client.connect();
        const result = await client.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        await client.end();
        if (result.rows.length > 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: "Login Success", user: username })
            };
        }
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: "Invalid credentials" })
        };
    }
    catch (err) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: err.message })
        };
    }
};

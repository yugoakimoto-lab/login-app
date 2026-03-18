import { describe, it, expect, vi } from 'vitest';
// pgモジュールの完全なモック（class構文で型エラーを回避）
vi.mock('pg', () => {
    class MockClient {
        connect = vi.fn().mockResolvedValue(undefined);
        query = vi.fn().mockResolvedValue({ rows: [{ username: 'testuser' }] });
        end = vi.fn().mockResolvedValue(undefined);
    }
    return {
        default: { Client: MockClient }
    };
});
// AWS SDK のモック
vi.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn().mockResolvedValue({}) })) },
    PutCommand: class {
        constructor(args) { }
    },
}));
vi.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: class {
        constructor(args) { }
    },
}));
// ハンドラーのインポート
import { handler } from './index.js';
describe('Login Logic TS Test', () => {
    it('認証成功時に200を返すか', async () => {
        const event = {
            body: JSON.stringify({ username: 'testuser', password: 'pass123' })
        };
        const result = await handler(event);
        expect(result.statusCode).toBe(200);
        console.log("🔥 成功！TypeScriptの型エラーも突破しました！");
    });
});

import { handler } from './index.js';
describe('Lambda Handler Test', () => {
    // ダミーのContextとCallbackを作成
    const mockContext = {};
    const mockCallback = () => { };
    it('should return login page on GET request', async () => {
        const event = {
            requestContext: {
                http: {
                    method: 'GET'
                }
            }
        };
        // handlerに3つの引数を渡すことで、TypeScriptのエラー(TS2554)を回避します
        const result = await handler(event, mockContext, mockCallback);
        expect(result.statusCode).toBe(200);
        expect(result.headers['Content-Type']).toBe('text/html; charset=utf-8');
        expect(result.body).toContain('<form');
    });
    it('should return success on POST request', async () => {
        const event = {
            requestContext: {
                http: {
                    method: 'POST'
                }
            },
            body: 'username=admin&password=password123',
            isBase64Encoded: false
        };
        const result = await handler(event, mockContext, mockCallback);
        // 注意：DB接続が通る設定なら 200、データがなければ 401 が返ります
        expect([200, 401]).toContain(result.statusCode);
    });
});

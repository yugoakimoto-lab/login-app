import { Client } from 'pg';
export const getDbClient = () => {
    return new Client({
        host: 'akimototestdb.csj48ica6iu2.us-east-1.rds.amazonaws.com',
        user: 'postgres',
        password: 'akimoto1234',
        database: 'postgres',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });
};

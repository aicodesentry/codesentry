const fs = require('fs');

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('../src/config/database', () => ({
  pool: {
    connect: jest.fn(),
  },
}));

const { pool } = require('../src/config/database');
const {
  applyMigrations,
  calculateChecksum,
  getPendingMigrations,
  listMigrationFiles,
} = require('../src/services/migrationRunner');

describe('migrationRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists SQL migrations in sorted order', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['0002_second.sql', 'notes.txt', '0001_first.sql']);

    const files = listMigrationFiles('/tmp/migrations');

    expect(files.map((file) => file.name)).toEqual(['0001_first.sql', '0002_second.sql']);
  });

  test('throws when migrations directory is missing', () => {
    fs.existsSync.mockReturnValue(false);

    expect(() => listMigrationFiles('/nonexistent')).toThrow(
      'Migrations directory not found: /nonexistent'
    );
  });

  test('throws when migrations directory contains no SQL files', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['README.md']);

    expect(() => listMigrationFiles('/tmp/migrations')).toThrow(
      'No SQL migration files found in migrations directory: /tmp/migrations'
    );
  });

  test('checksum is stable for identical SQL', () => {
    const sql = 'SELECT 1;';
    expect(calculateChecksum(sql)).toBe(calculateChecksum(sql));
  });

  test('returns only pending migrations', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['0001_first.sql', '0002_second.sql']);
    fs.readFileSync.mockImplementation((fullPath) => {
      if (fullPath.endsWith('0001_first.sql')) return 'SELECT 1;';
      return 'SELECT 2;';
    });

    const client = {
      query: jest.fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{ version: '0001_first.sql', checksum: calculateChecksum('SELECT 1;') }],
        }),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const pending = await getPendingMigrations('/tmp/migrations');

    expect(pending.map((migration) => migration.name)).toEqual(['0002_second.sql']);
    expect(client.release).toHaveBeenCalled();
  });

  test('takes an advisory lock while applying migrations', async () => {
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['0001_first.sql']);
    fs.readFileSync.mockReturnValue('SELECT 1;');

    const client = {
      query: jest.fn()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce(),
      release: jest.fn(),
    };
    pool.connect.mockResolvedValue(client);

    const applied = await applyMigrations('/tmp/migrations');

    expect(applied).toEqual(['0001_first.sql']);
    expect(client.query).toHaveBeenNthCalledWith(1, 'SELECT pg_advisory_lock($1)', [727274]);
    expect(client.query).toHaveBeenNthCalledWith(8, 'SELECT pg_advisory_unlock($1)', [727274]);
    expect(client.release).toHaveBeenCalled();
  });
});

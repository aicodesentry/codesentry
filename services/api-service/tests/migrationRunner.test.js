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
});

import asyncio
import os

import asyncpg


async def main():
    conn = await asyncpg.connect(
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres"),
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        database=os.environ.get("DB_NAME", "lifelink_db"),
    )
    await conn.execute(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'lifelink_db' AND pid <> pg_backend_pid()"
    )
    await conn.execute("DROP DATABASE IF EXISTS lifelink_db")
    await conn.execute("CREATE DATABASE lifelink_db")
    await conn.close()


if __name__ == "__main__":
    asyncio.run(main())

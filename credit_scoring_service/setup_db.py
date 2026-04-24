import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os

print("Connecting to PostgreSQL to setup database...")

# Step 1: Create the database if it doesn't exist
try:
    conn = psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="password",
        host="localhost",
        port="5432"
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute('CREATE DATABASE "credit_scoring_db";')
    cur.close()
    conn.close()
    print("Database 'credit_scoring_db' created successfully!")
except psycopg2.errors.DuplicateDatabase:
    print("Database 'credit_scoring_db' already exists.")
except Exception as e:
    print(f"Error creating database: {e}")

# Step 2: Execute db.sql to create tables and insert sample data
try:
    conn = psycopg2.connect(
        dbname="credit_scoring_db",
        user="postgres",
        password="password",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    with open("database/db.sql", "r") as f:
        sql = f.read()
    cur.execute(sql)
    conn.commit()
    cur.close()
    conn.close()
    print("Schema and sample data loaded successfully!")
except Exception as e:
    print(f"Error executing schema: {e}")

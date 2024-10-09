import psycopg2
import requests
import os
from flask import Flask, request, jsonify
from datetime import datetime

def connect_db():
    try:
        return psycopg2.connect(
            dbname="orderentrydev",
            user="postgres",
            password='Rafouu170686',
            host="localhost",
            port="5432"
        )
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return None

def fetch_data():
    conn = connect_db()
    print('connected')
    if conn is None:
        print('not connected')
        return None

    try:
        print('connected')
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                id, symbol, average_filled_price, average_sold_price, num_shares, 
                description, initial_stop_loss, updated_stop_loss, 
                stop_loss_triggered, ibkr_id, entrydate, exitdate 
            FROM trades
        """)
        rows = cur.fetchall()
        cur.close()
        conn.close()

        return [
            {
                "id": row[0],
                "symbol": row[1],
                "average_filled_price": row[2],
                "average_sold_price": row[3],
                "num_shares": row[4],
                "description": row[5],
                "initial_stop_loss": row[6],
                "updated_stop_loss": row[7],
                "stop_loss_triggered": row[8],
                "ibkr_id": row[9],
                "entrydate": row[10],
                "exitdate": row[11]
            }
            for row in rows
        ]
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None
    
def create_entry():
    data = request.json  # Get the JSON data from the request
    print(data)
    # Extract the data (you may want to validate these inputs)
    try:
        symbol = data['symbol']
        average_filled_price = data['average_filled_price']
        num_shares = data['num_shares']
        initial_stop_loss = data['initial_stop_loss']
        entrydate = data['entrydate']
    
        # Connect to the database
        conn = connect_db()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500

        cur = conn.cursor()
        cur.execute("""
            INSERT INTO trades (symbol, average_filled_price, num_shares, initial_stop_loss, entrydate) 
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (symbol, average_filled_price, num_shares, initial_stop_loss, entrydate))
        
        new_id = cur.fetchone()[0]
        conn.commit()  # Commit the transaction
        cur.close()
        conn.close()

        return jsonify({"id": new_id, "symbol": symbol, "average_filled_price": average_filled_price, 
                         "num_shares": num_shares,
                         "initial_stop_loss": initial_stop_loss,
                        
                        "entrydate": entrydate}), 201

    except Exception as e:
        print(f"Error creating entry: {e}")
        return jsonify({"error": "Failed to create entry"}), 500
    

def order_entry(symbol, average_filled_price,num_shares, initial_stop_loss ):
    #data = request.json  # Get the JSON data from the request
    #print(data)
    # Extract the data (you may want to validate these inputs)
    try:
        today = datetime.today()
        entrydate = today.strftime("%Y-%m-%d")
        # Connect to the database
        conn = connect_db()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500

        cur = conn.cursor()
        cur.execute("""
            INSERT INTO trades (symbol, average_filled_price, num_shares, initial_stop_loss, entrydate) 
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        """, (symbol, average_filled_price, num_shares, initial_stop_loss, entrydate))
        
        new_id = cur.fetchone()[0]
        conn.commit()  # Commit the transaction
        cur.close()
        conn.close()
        print('finish updated database')
        return jsonify({"id": new_id, "symbol": symbol, "average_filled_price": average_filled_price, 
                         "num_shares": num_shares,
                         "initial_stop_loss": initial_stop_loss,
                        
                        "entrydate": entrydate}), 201

    except Exception as e:
        print(f"Error creating entry: {e}")
        return jsonify({"error": "Failed to create entry"}), 500
    

def update_entry(entry_id):
    data = request.json  # Get the JSON data from the request
    print(data)
    try:
        
        average_sold_price = data.get('average_sold_price', None)  # Optional field
        updated_stop_loss = data.get('updated_stop_loss', None)  # Optional field
        stop_loss_triggered = data.get('stop_loss_triggered', False)  # Default to False if not provided
        description = data.get('description', '')  # Default to empty string if not provided

        # Connect to the database
        conn = connect_db()
        if conn is None:
            return jsonify({"error": "Database connection failed"}), 500

        cur = conn.cursor()
        # Update the entry in the trades table
        cur.execute("""
            UPDATE trades
            SET 
                average_sold_price = %s,
                updated_stop_loss = %s,
                stop_loss_triggered = %s,
                description = %s
            WHERE id = %s
        """, (average_sold_price, updated_stop_loss, stop_loss_triggered, description, entry_id))
        
        # Commit the transaction and close the connection
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"id": entry_id,
                        "average_sold_price": average_sold_price,
                        "updated_stop_loss": updated_stop_loss,
                        "stop_loss_triggered": stop_loss_triggered,
                        "description": description}), 200

    except Exception as e:
        print(f"Error updating entry: {e}")
        return jsonify({"error": "Failed to update entry"}), 500
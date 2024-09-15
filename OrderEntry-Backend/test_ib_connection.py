from ib_insync import IB

def test_ib_connection():
    ib = IB()
    try:
        # Attempt to connect to TWS or IB Gateway
        ib.connect('127.0.0.1', 7497, clientId=44, timeout=30)
        
        # If successful, print server information
        print("Connected successfully to Interactive Brokers API")
        #print(f"Server Version: {ib.serverVersion()}")
        #print(f"Connection Time: {ib.twsConnectionTime()}")
    
    except Exception as e:
        # Print the error if connection fails
        print(f"Failed to connect: {e}")
    
    finally:
        # Disconnect to clean up
        ib.disconnect()

if __name__ == "__main__":
    test_ib_connection()
import requests

def get_last_ask_price(api_key, symbol):
    # Define the endpoint for the Alpha Vantage API
    url = f"https://www.alphavantage.co/query"
    
    # Define the parameters for the API request
    params = {
        'function': 'TIME_SERIES_INTRADAY',  # Or use another function if needed
        'symbol': symbol,
        'interval': '1min',  # Adjust interval as needed
        'apikey': api_key
    }
    
    # Make the request to the Alpha Vantage API
    response = requests.get(url, params=params)
    
    # Check if the request was successful
    if response.status_code == 200:
        data = response.json()
        
        # Extract the last available time series data
        time_series = data.get('Time Series (1min)', {})
        if not time_series:
            print("No time series data available.")
            return None
        
        # Get the most recent time entry
        latest_time = sorted(time_series.keys(), reverse=True)[0]
        latest_data = time_series[latest_time]
        
        # Extract and return the 'ask' price
        # Alpha Vantage does not provide direct 'ask' prices; you may need to infer it from the high/low prices
        try:
            last_ask_price = latest_data.get('1. open', 'No ask price available')
            return last_ask_price
        except KeyError:
            print("Ask price data is not available.")
            return None
    else:
        print(f"Error fetching data: {response.status_code}")
        return None

# Example usage
api_key = 'D0RNNQCI13Q5V6NI'
symbol = 'AAPL'
last_ask_price = get_last_ask_price(api_key, symbol)
if last_ask_price:
    print(f"Last ask price for {symbol}: {last_ask_price}")
else:
    print("Failed to retrieve ask price.")

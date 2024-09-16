from flask import Flask, request, jsonify
from flask_cors import CORS 
from ibkr_client import IBKRClient
import requests
import threading
import time
import json


app = Flask(__name__)
CORS(app)  # Enable CORS

api_key = '797222e1admsh97b6b65cb3305ebp1e200fjsncf2c020d9c27'


def fetch_5min_candle_low(api_key, symbol):
    print('fetching 5 min')
    url = "https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history"
    print(symbol)
    querystring = {"symbol": symbol, "interval": "5m","diffandsplits":"false"}  # Fetch last 1 day's 5-min interval data

    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)
    #print('OK')
    if response.status_code == 200:
        res = response.json()
        try:
            #print(res)
            keys = list(res['body'].keys())
            lastkey = keys[-1]
            lowOfLast5MinCandle = res['body'][lastkey]['low']
            return lowOfLast5MinCandle
        except KeyError:
            return None
    else:
        return None

def fetch_last_ask_price(api_key, symbol):
    url = "https://yahoo-finance15.p.rapidapi.com/api/v1/markets/quote"
    querystring = {"ticker": symbol, "type": "STOCKS"}
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "yahoo-finance15.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)
    if response.status_code == 200:
        res = response.json()
        try:
            askPrice = res['body']['primaryData']['askPrice']
            if askPrice == 'N/A':
                askPrice = 0
            else:
                #print('askPrice:   ', askPrice )
                askPrice = float(askPrice.replace('$', '').replace(',', ''))
                #print(askPrice)
                lowOfDay = res['body']['keyStats']['dayrange']['value'].split("-")[0].strip()
                if lowOfDay == 'NA':
                    lowOfDay = 0.0
                else:
                    lowOfDay = float(lowOfDay.replace('$', '').replace(',', ''))
                return {'askPrice': askPrice, 'lowOfDay': lowOfDay}
        except KeyError:
            return None
    else:
        return None

@app.route('/get_last_ask_price', methods=['GET'])
def get_ask_price():
    ticker = request.args.get('ticker')
    timeframe = request.args.get('timeframe', '1Day')

    if timeframe == '1Day':
        if not ticker:
            return jsonify({'error': 'Ticker is required'}), 400
        price_data = fetch_last_ask_price(api_key, ticker)
        if price_data is None:
            return jsonify({'error': 'No ask price available'}), 500
    
        return jsonify({
            'askPrice':price_data['askPrice'],
            'lowOfDay': price_data['lowOfDay']
        })
    else:
        print('this is 5min')
        if not ticker:
            return jsonify({'error': 'Ticker is required'}), 400
        last5min = fetch_5min_candle_low(api_key, ticker)
        price_data = fetch_last_ask_price(api_key, ticker)
        if price_data is None:
            return jsonify({'error': 'No ask price available'}), 500
        return jsonify({
            'askPrice':price_data['askPrice'],
            'lowOfDay': last5min
        })
    
# Initialize IBKR client


@app.route('/send_order', methods=['POST'])
def send_order():
    data = request.json
    ticker = data.get('ticker')
    action = data.get('action')
    quantity = data.get('adjustedQuantity')
    order_type = data.get('orderType')
    time_in_force = data.get('timeInForce')
    stop_loss = data.get('stopLoss')
    print('test')
    # Initialize IBKR client and set order data
    client = IBKRClient()
    client.set_order_data(ticker, action, quantity, order_type, time_in_force, stop_loss)
    print('client')
    # Connect to TWS/IB Gateway and run the client
    port_prod = 7496
    port_paper = 7497
    client.connect("127.0.0.1", port_paper, 100)
    print('connected')
    client.run()

    # Run the client and wait for the order to complete
    client.run_until_complete()
    print('finish')
    #print(json.dumps(client.response, indent=4))
    return jsonify(client.response),200
    #return jsonify({'status': 'Order completed'}), 200



if __name__ == '__main__':
    app.run(debug=True)

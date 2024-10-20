from flask import Flask, request, jsonify
from flask_cors import CORS 
from ibkr_client import IBKRClient
from tableDetails import fetch_data,create_entry,order_entry,update_entry
import requests
import threading
import time
import json


app = Flask(__name__)
CORS(app)  # Enable CORS

api_key = '797222e1admsh97b6b65cb3305ebp1e200fjsncf2c020d9c27'


def fetch_5min_candle_low(api_key, symbol):
    print('started')
    url = "https://yh-finance.p.rapidapi.com/stock/v3/get-chart"

    querystring = {"interval":"5m","symbol":symbol,"range":"1d","region":"US","includePrePost":"false","useYfid":"true","includeAdjustedClose":"false","events":"capitalGain,div,split"}

    headers = {
	    "x-rapidapi-key": api_key,
	    "x-rapidapi-host": "yh-finance.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)
    #print('OK')
    if response.status_code == 200:
        res = response.json()
        #print(res)
        try:
            #print(res)
            low = res['chart']['result'][0]['indicators']['quote'][0]['low'][-1]
            close = res['chart']['result'][0]['indicators']['quote'][0]['close'][-1]

            if low == close:
                low = res['chart']['result'][0]['indicators']['quote'][0]['low'][-2]
                close = res['chart']['result'][0]['indicators']['quote'][0]['close'][-2]
            return {'askPrice': round(close,3), 'lowOfDay': round(low,3)}
        except KeyError:
            return None
    else:
        return None

def fetch_last_ask_price(api_key, symbol):

    url = "https://yh-finance.p.rapidapi.com/stock/v3/get-chart"

    querystring = {"interval":"1d","symbol":symbol,"range":"1d","region":"US","includePrePost":"false","useYfid":"true","includeAdjustedClose":"true","events":"capitalGain,div,split"}

    headers = {
	"x-rapidapi-key":api_key,
	"x-rapidapi-host": "yh-finance.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)

    if response.status_code == 200:
        print("res200")
        res = response.json()
        try:
            askPrice = res['chart']['result'][0]['indicators']['quote'][0]['close'][0]
            
            if askPrice == 'N/A':
                askPrice = 0
            else:
                print('askPrice:   ', askPrice )
                askPrice = float(askPrice)
                #print(askPrice)
                lowOfDay =res['chart']['result'][0]['indicators']['quote'][0]['low'][0]
                print(lowOfDay)
                if lowOfDay == 'NA':
                    lowOfDay = 0.0
                else:
                    lowOfDay = float(lowOfDay)
                return {'askPrice': round(askPrice,3), 'lowOfDay': round(lowOfDay,3)}
        except KeyError:
            return None
    else:
        return None
    
@app.route('/get_table_data', methods=['GET'])
def get_table_data():
    print('in table')
    data = fetch_data()  # Call the function to fetch data from the database
    if data is None:
        return jsonify({'error': 'Could not fetch data'}), 500
    return jsonify(data)


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
        print(last5min)
        if last5min is None:
            return jsonify({'error': 'No ask price available'}), 500
        return jsonify({
            'askPrice':last5min['askPrice'],
            'lowOfDay': last5min['lowOfDay']
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
    print(stop_loss)
    print(quantity)
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
    order_res = client.response
    print('order_res: ==>',order_res)
    print(order_res['status'])
    if order_res['status'] == 'Filled':
        print('test')
        order_entry(ticker.upper(), order_res['avgFillPrice'], order_res['filled'], order_res['stopLossPrice'])
        print('============================================')
        updated_data = fetch_data()
        print('============================================')
        if updated_data is None:
            return jsonify({'error': 'Could not fetch updated data'}), 500
    print('gogogog ==>',updated_data)
    response_data = {
        "updated_data": updated_data,
        "client_response": client.response  # Adjust to access the response from your client
    }
    return jsonify(response_data), 200
    #return jsonify(client.response),200
    #return jsonify({'status': 'Order completed'}), 200

@app.route('/post_manual_trade', methods=['POST'])
def post_manual_data():
    data = request.json
    print('posting...')
    print(data)
    try:
        create_entry()
        print('entry-created')
    except:
        print("error creating new line in db")  # Call the function to fetch data from the database
    if data is None:
        return jsonify({'error': 'Could not send data'}), 500
    return jsonify(data)

@app.route('/update_trade/<int:entry_id>', methods=['PUT'])
def update_trade(entry_id):
    data = request.json
    try:
        # Perform the update operation
        update_entry(entry_id)
        
        # Fetch updated table data
        updated_data = fetch_data()
        if updated_data is None:
            return jsonify({'error': 'Could not fetch updated data'}), 500

        # Return the updated data to the frontend
        return jsonify(updated_data), 200

    except Exception as e:
        print(f"Error updating entry: {e}")
        return jsonify({"error": "Failed to update entry"}), 500




if __name__ == '__main__':
    app.run(debug=True)

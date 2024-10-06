from ibapi.client import *
from ibapi.wrapper import *
from ibapi.contract import Contract
from ibapi.order import Order
from threading import Event
from flask import Flask, jsonify, request
from datetime import date

class IBKRClient(EClient, EWrapper):
    def __init__(self):
        EClient.__init__(self, self)
        self.nextOrderId = None
        self.contract_data = {}
        self.order_complete = Event()

    def set_order_data(self, ticker, action, adjustedQuantity, order_type, time_in_force, stop_loss):
        self.contract_data = {
            'ticker': ticker,
            'action': action,
            'quantity': adjustedQuantity,
            'order_type': order_type,
            'time_in_force': time_in_force,
            'stop_loss': stop_loss,
        }
        #print('tick==>',self.contract_data['ticker'])
        #print('Action==>',self.contract_data['action'])
        #print('Quantity==>',self.contract_data['quantity'])

    def nextValidId(self, orderId: OrderId):
        #print('nextValidID')
        self.nextOrderId = orderId
        #print(f"Next valid orderId: {self.nextOrderId}")

        # Define contract using the ticker passed from the Flask app
        mycontract = Contract()
        mycontract.symbol = self.contract_data['ticker']
        mycontract.secType = "STK"    
        mycontract.exchange = "SMART"
        mycontract.currency = "USD"
        #print('running contract')
        # Request contract details
        self.reqContractDetails(self.nextOrderId, mycontract)

    def contractDetails(self, reqId: int, contractDetails: ContractDetails):
        print(f"Contract details: {contractDetails.contract}")

        # Define the order using the data passed from the Flask app
        myorder = Order()
        myorder.orderId = self.nextOrderId
        print('myorder.orderId',myorder.orderId)  # Use the next valid order ID
        myorder.action = self.contract_data['action']
        myorder.tif = self.contract_data['time_in_force']
        myorder.orderType = self.contract_data['order_type']
        myorder.totalQuantity = self.contract_data['quantity']
        myorder.transmit = False
        stopLoss = Order()
        stopLoss.orderId = myorder.orderId + 1
        #print('stopLoss.orderId', stopLoss.orderId)
        #print('stopLoss.orderId', self.contract_data['action'])
        stopLoss.action = 'SELL' if self.contract_data['action'] == 'Buy' else 'BUY'
        stopLoss.orderType = 'STP'
        #Stop trigger price
        stopLoss.auxPrice = self.contract_data['stop_loss']
        stopLoss.totalQuantity = self.contract_data['quantity']
        stopLoss.parentId = myorder.orderId
        #In this case, the low side order will be the last child being sent. Therefore, it needs to set this attribute to True
        #to activate all its predecessors
        stopLoss.transmit = True


        #print('ordering')
        # Place the order
        self.placeOrder(myorder.orderId, contractDetails.contract, myorder)
        #print('order ok waiting for SL')
        self.placeOrder(stopLoss.orderId, contractDetails.contract, stopLoss)

    def orderStatus(self, orderId: OrderId, status: str, filled: float, remaining: float, avgFillPrice: float, permId: int, parentId: int, lastFillPrice: float, clientId: int, whyHeld: str, mktCapPrice: float):
        print(f"orderStatus. orderId: {orderId}, status: {status}, filled: {filled}, remaining: {remaining}, avgFillPrice: {avgFillPrice}")
        self.response = {
            'status':status,
            'filled': round(float(filled),2),
            'avgFillPrice': round(float(avgFillPrice),2),
            'stopLossPrice': round(float(self.contract_data['stop_loss']), 2), 
            'riskedDollars': round(float(avgFillPrice) - float(self.contract_data['stop_loss']),2),
            'InvestedCapital': round(float(avgFillPrice) * float(filled),2),
            'riskedCapital':round(float(filled)*(float(avgFillPrice) - float(self.contract_data['stop_loss'])),2),
            'orderData': date.today()
            
        }

        # Check if the order is completed
        #print('status')
        if status in ['Filled', 'Cancelled']:
            print("Order completed. Disconnecting...")
            self.order_complete.set()
            self.disconnect()
        
        #return jsonify(response)

    def execDetails(self, reqId: int, contract: Contract, execution: Execution):
        print(f"execDetails. reqId: {reqId}, contract: {contract}, execution: {execution}")

    def openOrder(self, orderId: OrderId, contract: Contract, order: Order, orderState: OrderState):
        print(f"openOrder. orderId: {orderId}, contract: {contract}, order: {order}")

    def exitAPP(self):
        self.disconnect()

    def run_until_complete(self):
        self.order_complete.wait()  # Wait until the order is complete


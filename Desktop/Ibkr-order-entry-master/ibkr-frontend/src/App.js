import React, { useState, useEffect, useRef, memo } from 'react';
import './App.css';
import { ThreeDots } from 'react-loader-spinner'; // Import the loader component
import { SwipeableButton } from "react-swipeable-button";
import { toast, ToastContainer, Bounce, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import TabDetails from './TabDetails';
import Chart from './chart';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';


function App() {
  //toast.configure();

  const [ticker, setTicker] = useState('');
  const [askPrice, setAskPrice] = useState('');
  const [action, setAction] = useState('Buy');
  const [quantity, setQuantity] = useState(0);
  const [orderType, setOrderType] = useState('Market');
  const [timeInForce, setTimeInForce] = useState('GTC');
  const [investedCapital, setInvestedCapital] = useState(28000);
  const [riskPerTrade, setRiskPerTrade] = useState(1);
  const [stopLoss, setStopLoss] = useState('');
  const [stopLossPercentage, setStopLossPercentage] = useState(''); // New state for SL(%)
  const [takeProfit, setTakeProfit] = useState('');
  const [lowOfDay, setLowOfDay] = useState('');
  const [askDate, setAskDate] = useState('');
  const [askTime, setAskTime] = useState('');
  const [lowDate, setLowDate] = useState('');
  const [lowTime, setLowTime] = useState('');
  const [timeframe, setTimeframe] = useState('1Day'); // Default timeframe
  const [sliderValue, setSliderValue] = useState(0); // New state for slider
  const [sliderPosition, setSliderPosition] = useState(false); // New state for slider
  const [loading, setLoading] = useState(false); // State for loader
  const [resetKey, setResetKey] = useState(0); // To force re-render
  const [quantityFraction, setQuantityFraction] = useState('full'); // Default selection: 'Full'
  const [adjustedQuantity, setAdjustedQuantity] = useState(quantity); // Adjusted quantity based on button selection
  const [fetchedData, setFetchedData] = useState([]); // State to hold fetched data
  const [selectedView, setSelectedView] = useState('Trades');
  
  
  const fetchDataFromBackend = async () => {
    try {
      const response = await fetch('http://localhost:5000/get_table_data');
      const data = await response.json();
      console.log('Data fetched from backend:', data);
      setFetchedData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    // Fetch data when component mounts
    

    fetchDataFromBackend();
  }, []);
  
  const handleQuantityFractionChange = (fraction) => {
    setQuantityFraction(fraction);
    switch (fraction) {
      case 'half':
        setQuantityFraction('half');
        setAdjustedQuantity(quantity / 2);
        break;
      case 'quarter':
        setQuantityFraction('quarter');
        setAdjustedQuantity(quantity / 4);
        
        break;
      default:
        setAdjustedQuantity(quantity);
        break;
    }
  };

  
  useEffect(() => {
    if (askPrice && stopLoss) {
      const slPercentage = ((askPrice - stopLoss) / stopLoss * 100).toFixed(2);
      setStopLossPercentage(slPercentage);
    }
  }, [askPrice, stopLoss]);
  
  
  useEffect(() => {
    if (askPrice && stopLoss && investedCapital && riskPerTrade) {
      const calculatedQuantity = Math.ceil(
        (investedCapital * riskPerTrade / 100) / (askPrice - stopLoss)
      );
      setQuantity(calculatedQuantity);
    }
  }, [askPrice, stopLoss, investedCapital, riskPerTrade]);

  const resetButton = () => {
    setResetKey(prevKey => prevKey + 1); // Increment key to trigger re-render
    setSliderPosition(false); // Reset slider position state if necessary
  };

  const CustomPreSubmittedToast = () => (
    <div>
        <div>Order placed successfully!</div>
        <div>The order is PreSubmitted and will be placed at Market when it opens.</div>
    </div>
);

const CustomFilledToast = ({filled, avgFillPrice, riskedDollars, InvestedCapital, RiskedCapital}) => (
  <div>
      <div>Order Filled successfully!</div>
      <div>You just  bought {filled} Shares for ${avgFillPrice}</div>
      <div>You invested ${InvestedCapital}</div>
      <div>You are risking ${riskedDollars} - for a total risk of ${RiskedCapital}</div>
  </div>
);

  useEffect(() => {
    // Update adjustedQuantity when quantity or quantityFraction changes
    switch (quantityFraction) {
      case 'half':
        setAdjustedQuantity(quantity / 2);
        break;
      case 'quarter':
        setAdjustedQuantity(quantity / 4);
        break;
      default:
        setAdjustedQuantity(quantity);
        break;
    }
  }, [quantity, quantityFraction]); 

  const handleGetData = async () => {
    setLoading(true); // Show loader
    try {
      const response = await fetch(`http://localhost:5000/get_last_ask_price?ticker=${ticker}&timeframe=${timeframe}`);
      const data = await response.json();
      console.log(data)
      if (data.askPrice !== undefined || data.lowOfDay !== undefined) {
        const askPrice = parseFloat(data.askPrice);
        const lowOfDay = parseFloat(data.lowOfDay);
        setAskPrice(askPrice);
        setLowOfDay(lowOfDay);
        setStopLoss(lowOfDay);
        console.log(askPrice) // Update stop loss with the low of the day
        const calculatedQuantity = Math.ceil(
          (investedCapital * riskPerTrade / 100) / (askPrice - lowOfDay)
        );
        console.log(calculatedQuantity)
        setQuantity(calculatedQuantity);
        setAdjustedQuantity(calculatedQuantity)
        setSliderPosition(false)
        setResetKey(prevKey => prevKey + 1);
      } else {
        alert(data.error || 'Error fetching ask price');
      }
    } catch (error) {
      alert('Failed to fetch data');
    } finally {
      setLoading(false); // Hide loader
    }
  };

  const handleSLPercentageChange = (e) => {
    const slPercentage = e.target.value;
    setStopLossPercentage(slPercentage);

    if (askPrice) {
      const newStopLoss = askPrice - (askPrice * slPercentage / 100);
      setStopLoss(newStopLoss.toFixed(2));
    }
  };


  const sendOrder = async () => {
    if (sliderPosition !== true) return; // Don't send if slider isn't at 100
    setLoading(true); // Show loader
    try {
      const response = await fetch('http://localhost:5000/send_order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker,
          action,
          adjustedQuantity,
          orderType,
          timeInForce,
          stopLoss
        }),
      });
  
      const data = await response.json();
      console.log('data ===>  ', data)
      setFetchedData(data['updated_data'])
      if (data['client_response'].status === 'PreSubmitted') {
        toast.info(<CustomPreSubmittedToast />, {
          position: 'top-right',
          autoClose: false, // Keep the toast persistent
          theme:'colored',
          transition: Slide,
          html: true // Apply custom class for color
        });
      } else if (data['client_response'].status === 'Filled' || data['client_response'].statuss === 'PartiallyFilled') {
        toast.success(<CustomFilledToast filled={data['client_response'].filled} avgFillPrice={data['client_response'].avgFillPrice} riskedDollars={data['client_response'].riskedDollars} InvestedCapital={data['client_response'].InvestedCapital} RiskedCapital={data['client_response'].riskedCapital} />, {
          position: 'top-right',
          autoClose: false, // Keep the toast persistent
          theme:'colored',
          transition: Slide,
          html: true // Apply custom class for color
        });
      } else if (data['client_response'].status === 'Cancelled' || data['client_response'].status === 'ApiCancelled') {
        toast.warn('The order was cancelled by API.', {
          position: 'top-right',
          autoClose: false, // Keep the toast persistent
          theme:'colored',
          transition: Slide,
          html: true // Apply custom class for color
        });
      } else if (data['client_response'].status === 'Rejected') {
        toast.error('The order was cancelled by broker.', {
          position: 'top-right',
          autoClose: false, // Keep the toast persistent
          theme:'colored',
          transition: Slide,
          html: true // Apply custom class for color
        });
      } else {
        toast.error('Failed to place order: ' + data.error, {
          position: 'top-right',
          autoClose: false, // Keep the toast persistent
          theme:'colored',
          transition: Slide,
          html: true // Apply custom class for color
        });
      }
      
    } catch (error) {
      alert('Error sending order: ' + error.message);
    } finally {
      setLoading(false); // Hide loader
      setTicker('');
      setAskPrice('');
      setAction('Buy');
      setQuantity(0);
      setOrderType('Market');
      setTimeInForce('GTC');
      setInvestedCapital(28000);
      setRiskPerTrade(0.5);
      setStopLoss('');
      setStopLossPercentage('');
      setTakeProfit('');
      setLowOfDay('');
      setAskDate('');
      setAskTime('');
      setLowDate('');
      setLowTime('');
      setTimeframe('1Day');
      setSliderValue(0);
      setSliderPosition(false);
      setQuantityFraction('full');
      setAdjustedQuantity(0); // Reset adjusted quantity
      setResetKey(prevKey => prevKey + 1); // Trigger re-render if needed
    }
  };

  const handleActionChange = (newAction) => {
    setAction(newAction);
  };

  // Calculate the risk per share and total risk
  const riskPerShare = askPrice && stopLoss ? askPrice - stopLoss : 0;
  const totalRisk = (riskPerShare * adjustedQuantity).toFixed(0);
  const totalInvestedCapital = (adjustedQuantity * askPrice).toFixed(0);
  const investedOnPortfolio = (totalInvestedCapital / investedCapital * 100).toFixed(2);
  const riskPer = (((askPrice - stopLoss) / stopLoss) * 100).toFixed(2);

  return (
    <div class="app-container">
      <div className='line1'>
        <div className="app">
          <ToastContainer />
          <div className="form-container">
          <div className="order-entry-section">
            <h3>Order Entry</h3>
            <div className="form-group">
              <label>Ticker:</label>
              <input 
                type="text" 
                value={ticker} 
                onChange={(e) => setTicker(e.target.value)} 
                className="input-field ticker-input tickerInput"  /* Added class name */
              />
              
              <div className="timeframe-buttons">
                <button
                  className={`timeframe-btn ${timeframe === '1Day' ? 'active' : ''}`}
                  onClick={() => setTimeframe('1Day')}
                >
                  1Day
                </button>
                <button
                  className={`timeframe-btn ${timeframe === '5Min' ? 'active' : ''}`}
                  onClick={() => setTimeframe('5Min')}
                >
                  5Min
                </button>
              </div>
              
              <button onClick={handleGetData} className="btn marg">
                Get Data
              </button>
              {loading && <ThreeDots color="#007bff" height={40} width={80} />} {/* Loader */}
            </div>
            <div className="form-group">
              <label>Ask Price:</label>
              <input 
                type="number" 
                value={askPrice}   
                className="input-field"
                onChange={(e) => setAskPrice(e.target.value)}
                step='0.01' 
              />
            </div>
            <div className="form-group">
              <label>Stop Loss:</label>
              <input 
                type="number" 
                value={stopLoss} 
                onChange={(e) => setStopLoss(e.target.value)}
                step='0.01' 
                className="input-field"
              />
            </div>
            {/* New SL(%) Field */}
            <div className="form-group">
              <label>SL(%):</label>
              <input 
                type="number" 
                value={stopLossPercentage}
                onChange={handleSLPercentageChange} 
                step='0.01' 
                className="input-field"
              />
            </div>
            <div className="form-group">
              <div className="action-buttons">
                <button
                  className={`action-btn buy ${action === 'Buy' ? 'active buy-active' : ''}`}
                  onClick={() => handleActionChange('Buy')}
                >
                  Buy
                </button>
                <button
                  className={`action-btn sell ${action === 'Sell' ? 'active sell-active' : ''}`}
                  onClick={() => handleActionChange('Sell')}
                >
                  Sell
                </button>
              </div>
            </div>
            <div className="form-group">

          <div className="quantity-buttons">
            <button
              className={`btn ${quantityFraction === 'full' ? 'active' : ''}`} // active class when full is selected
              onClick={() => handleQuantityFractionChange('full')}
            >
              Full
            </button>
            <button
              className={`btn ${quantityFraction === 'half' ? 'active' : ''}`} // active class when half is selected
              onClick={() => handleQuantityFractionChange('half')}
            >
              1/2
            </button>
            <button
              className={`btn ${quantityFraction === 'quarter' ? 'active' : ''}`} // active class when quarter is selected
              onClick={() => handleQuantityFractionChange('quarter')}
            >
              1/4
            </button>
          </div>
          </div>
            <div className="form-group">
              <label>Quantity:</label>
              <input 
                type="number" 
                value={adjustedQuantity} 
                onChange={(e) => setAdjustedQuantity(e.target.value)} 
                step='1'
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label>Order Type:</label>
              <select 
                value={orderType} 
                onChange={(e) => setOrderType(e.target.value)} 
                className="input-field"
              >
                <option value="Market">Market</option>
                <option value="Limit">Limit</option>
              </select>
            </div>
            <div className="form-group">
              <label>Time in Force:</label>
              <select 
                value={timeInForce} 
                onChange={(e) => setTimeInForce(e.target.value)} 
                className="input-field"
              >
                <option value="GTC">GTC</option>
                <option value="IOC">IOC</option>
              </select>
            </div>
          </div>
          </div>
          <div className="summary-box">
          <h3>Order Summary</h3>
          <ul>
            <li>Order Type: <strong>{action}</strong></li>
            <li># of Shares: <strong style={{ color: 'red' }}>{adjustedQuantity}</strong></li>
            <li>Ask Price: <strong>{askPrice}</strong></li>
            <li>Stop Loss: <strong style={{ color: 'red' }}>{stopLoss}</strong></li>
            <li>Max Loss: <strong style={{ color: 'red' }}>{totalRisk}$</strong> - {riskPer}%</li>
            <li>Invested Capital: {totalInvestedCapital}$ - ({investedOnPortfolio}% of Cap)</li>
          </ul>
        
          <div className="w-[500px] h-[100px] bg-white">
        <SwipeableButton
                    onSuccess={(e) => setSliderPosition(true)}  //callback function
                    text="Confirm order" //string 
                    text_unlocked="Order Locked" //string
                    key={resetKey}
                    color="#16362d" //css hex color
                  />
        </div>
          <div className='form-group marg'>
            <button 
              onClick={sendOrder} 
              className="btn marg" 
              disabled={sliderPosition !== true} // Disable button if slider isn't at max value
            >
              Send Order
            </button>
            {loading && <ThreeDots color="#007bff" height={40} width={80} />} {/* Loader */}
          </div>
        
        
          </div>
        </div>
        <div className='chart'><Chart key={ticker} ticker={ticker}/></div>
      </div> 
      <div className='line2'>
      <div className="button-group-container">
      <ButtonGroup size="large" aria-label="Large button group">
        <Button onClick={() => setSelectedView('Trades')}
          color={selectedView === 'Trades' ? 'primary' : 'default'}>Trades</Button>
          <Button onClick={() => setSelectedView('Comps')}
          color={selectedView === 'Comps' ? 'primary' : 'default'}>Comps</Button>
           
      </ButtonGroup>
      </div>
      {selectedView === 'Trades' ? (
          <TabDetails tableData={fetchedData} fetchDataFromBackend={fetchDataFromBackend} />
        ) : (
          "Hello World"
        )}
      
      </div>
    </div>
    
  );
}

export default App;

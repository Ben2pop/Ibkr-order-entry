import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget({ticker}) {
  const container = useRef();
  
  useEffect(() => {
    // Check if the script is already added
    const existingScript = document.getElementById('tradingview-widget-script');
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = 'tradingview-widget-script'; // Assign an ID for reference
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `{
        "autosize": true,
        "symbol": "${ticker || 'AAPL'}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "backgroundColor": "rgba(255, 255, 255, 1)",
        "allow_symbol_change": false,
        "save_image": false,
        "details": true,
        "calendar": false,
        "support_host": "https://www.tradingview.com"
      }`;
      container.current.appendChild(script);
    }
  }, [ticker]);

  return (
    <div className='charting'>
      <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
        <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
        <div className="tradingview-widget-copyright">
          <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
            <span className="blue-text">Track all markets on TradingView</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);

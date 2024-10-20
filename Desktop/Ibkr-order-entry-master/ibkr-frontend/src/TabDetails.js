import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyncAlt, faPlus, faMinus, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import './TabDetails.css';

const DynamicTable = ({ tableData = [], fetchDataFromBackend }) => {
  const [sortedData, setSortedData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [modalState, setModalState] = useState({
    showModal: false,
    editMode: false,
    entry: {
      id: tableData.length + 1,
      symbol: "",
      average_filled_price: "",
      average_sold_price: "",
      num_shares: "",
      description: "",
      initial_stop_loss: "",
      updated_stop_loss: "",
      stop_loss_triggered: false,
      entrydate: "",
    }
  });

  useEffect(() => {
    const sortData = (data) => {
      const withSalePrice = data.filter(row => row.average_sold_price);
      const withoutSalePrice = data.filter(row => !row.average_sold_price);
      const sortByDate = (a, b) => new Date(b.entrydate) - new Date(a.entrydate);
      const sortById = (a, b) => a.id - b.id;
      const sortedWithoutSalePrice = withoutSalePrice.sort(sortById);
      const sortedWithSalePrice = withSalePrice.sort(sortByDate);
      return [...sortedWithoutSalePrice, ...sortedWithSalePrice];
    };

    setSortedData(sortData(tableData));
  }, [tableData]);

  const handleEditEntry = (entry) => {
    setModalState({
      showModal: true,
      editMode: true,
      entry
    });
  };

  const handleAddEntry = () => {
    setModalState({
      showModal: true,
      editMode: false,
      entry: {
        id: tableData.length + 1,
        symbol: "",
        average_filled_price: "",
        average_sold_price: "",
        num_shares: "",
        description: "",
        initial_stop_loss: "",
        updated_stop_loss: "",
        stop_loss_triggered: false,
        entrydate: "",
      }
    });
  };

  const handleCloseModal = () => {
    setModalState({ ...modalState, showModal: false });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setModalState({
      ...modalState,
      entry: {
        ...modalState.entry,
        [name]: type === 'checkbox' ? checked : 
                type === 'number' ? parseFloat(value) : value,
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { editMode, entry } = modalState;

    try {
      let response;
      if (editMode) {
        response = await fetch(`http://localhost:5000/update_trade/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      } else {
        response = await fetch(`http://localhost:5000/post_manual_trade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        });
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error in request');

      fetchDataFromBackend();
      handleCloseModal();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows(prevState => ({
      ...prevState,
      [id]: !prevState[id]
    }));
  };

  const getStatus = (pnl) => {
    if (pnl === null) return "OPEN";
    return parseFloat(pnl) > 0 ? "WIN" : "LOSS";
  };

  return (
    <div className="table-container">
      <div className="table-action-buttons">
        <button onClick={fetchDataFromBackend} className="table-action-button">
          <FontAwesomeIcon icon={faSyncAlt} /> Reload
        </button>
        <button onClick={handleAddEntry} className="table-action-button">
          <FontAwesomeIcon icon={faPlus} /> Add Entry
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Symbol</th>
            <th>Buy Price</th>
            <th>Number of Shares</th>
            <th>Invested Capital</th>
            <th>Risked Capital</th>
            <th>Initial Stop Loss</th>
            <th>Risk</th>
            <th>Updated Stop Loss</th>
            <th>Sale Price</th>
            <th>P&L</th>
            <th>Stop Loss Triggered</th>
            <th>Entry Date</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length > 0 ? (
            sortedData.map((row) => {
              const investedCapital = row.num_shares * row.average_filled_price;
              const riskedCapital = (row.average_filled_price - row.initial_stop_loss) * row.num_shares;
              const riskpercentage = ((row.average_filled_price - row.initial_stop_loss) / row.initial_stop_loss) * 100;
              const riskDoll = (row.average_filled_price - row.initial_stop_loss);
              const pnl = row.average_sold_price ? ((row.average_sold_price - row.average_filled_price) * row.num_shares).toFixed(2) : null;
              const status = getStatus(pnl);
              const rowStyle = status === "WIN" ? { backgroundColor: '#d4edda' } : status === "LOSS" ? { backgroundColor: '#f8d7da' } : {};
              const isExpanded = expandedRows[row.id] || false;

              return (
                <React.Fragment key={row.id}>
                  <tr style={rowStyle}>
                    <td>{row.id}</td>
                    <td>{row.symbol}</td>
                    <td>${row.average_filled_price ? Number(row.average_filled_price).toFixed(2) : '-'}</td>
                    <td>{row.num_shares}</td>
                    <td>${investedCapital.toFixed(2)}</td>
                    <td>${riskedCapital.toFixed(2)}</td>
                    <td>${row.initial_stop_loss}</td>
                    <td>{riskpercentage.toFixed(2)}% - (${riskDoll.toFixed(2)})</td>
                    <td>${row.updated_stop_loss}</td>
                    <td>${row.average_sold_price}</td>
                    <td>${pnl}</td>
                    <td>{row.stop_loss_triggered ? "Yes" : "No"}</td>
                    <td>{row.entrydate}</td>
                    <td>{status}</td>
                    <td>
                      <button className="expand-button" onClick={() => toggleRowExpansion(row.id)}>
                        <FontAwesomeIcon icon={isExpanded ? faMinus : faPlus} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="expanded-row">
                      <td colSpan="15">
                        <div className="expanded-content">
                          <p><strong>Description:</strong> {row.description}</p>
                          <button className="edit-button" onClick={() => handleEditEntry(row)}>
                            <FontAwesomeIcon icon={faPenToSquare} /> Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <tr>
              <td colSpan="15">No data available</td>
            </tr>
          )}
        </tbody>
      </table>

      {modalState.showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{modalState.editMode ? "Edit Entry" : "Add New Entry"}</h2>
            <form onSubmit={handleSubmit}>
              {!modalState.editMode && (
                <>
                  <div className="form-group">
                    <label>Symbol:</label>
                    <input
                      type="text"
                      name="symbol"
                      value={modalState.entry.symbol}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Buy Price:</label>
                    <input
                      type="number"
                      name="average_filled_price"
                      value={modalState.entry.average_filled_price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Number of Shares:</label>
                    <input
                      type="number"
                      name="num_shares"
                      value={modalState.entry.num_shares}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Initial Stop Loss:</label>
                    <input
                      type="number"
                      name="initial_stop_loss"
                      value={modalState.entry.initial_stop_loss}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Entry Date:</label>
                    <input
                      type="date"
                      name="entrydate"
                      value={modalState.entry.entrydate}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}
              {modalState.editMode && (
                <>
                  <div className="form-group">
                    <label>Sale Price:</label>
                    <input
                      type="number"
                      name="average_sold_price"
                      value={modalState.entry.average_sold_price}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Updated Stop Loss:</label>
                    <input
                      type="number"
                      name="updated_stop_loss"
                      value={modalState.entry.updated_stop_loss}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Stop Loss Triggered:</label>
                    <input
                      type="checkbox"
                      name="stop_loss_triggered"
                      checked={modalState.entry.stop_loss_triggered}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  name="description"
                  value={modalState.entry.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="modal-submit-button">
                  Submit
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="modal-close-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicTable;
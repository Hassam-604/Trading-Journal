# Trading Journal & Visual Review System (v1.1)

A high-performance, dark-themed trading journal web application built for multi-asset traders across **Forex, Crypto, Indices, Commodities (Gold/Silver/Oil), and Stocks**. Features automated R-multiple and P&L calculations, multi-timeframe trade gallery lightbox viewer, setup performance analytics, missed trade / level test tracking, and full backup/export.

---

## 🌟 Key Features

### 1. 📒 Trade Journal & Execution Log
- **Auto-Calculations**: Automatic P&L ($), R-multiple, Risk/Reward ratio, and Win/Loss/BE classification on entry.
- **Trade Metadata**: Session tagging (London, New York, Asia), Entry/SL/TP, Direction (Buy/Sell), Confluences, Rules Followed, Mistake tracking, and Lessons learned.
- **Account Balance Manager**: Dynamic starting balance and current net balance tracking directly from the topbar.

### 2. 📸 Visual Review & Trade Gallery (New in v1.1)
- **Thumbnail Grid & Masonry View**: Responsive gallery with result-colored accents (Win, Loss, BE), timeframe pills, setup badges, and R values.
- **9 Granular Filters**: Filter by Result, Timeframe/Category, Direction, Setup, Session, Review Status, Date Range, and R-Multiple.
- **Multi-Screenshot Support per Trade**: Attach multiple full-resolution screenshots (HTF, 15M, 5M, 1M, Before Entry, After Entry, Result) to a single trade.
- **Full-Screen Lightbox**:
  - Zoom in / Zoom out / Fit to screen / 1:1 original size.
  - Interactive mouse drag/pan when zoomed.
  - Keyboard navigation (`←` / `→` arrows, `Esc`, `F` fullscreen).
  - Collapsible sidebar with trade details and notes.
- **Review Mode**: Rapid sequential review flow to audit and mark trades as reviewed.

### 3. 🧩 Setup Analysis (New in v1.1)
- **Performance by Setup**: Win rate %, total P&L, total R, average R per trade, and win/loss/breakeven distribution bars.
- **Isolated Setup Gallery**: View every chart screenshot associated with a specific setup in one place.

### 4. 🎯 Research & Level Testing
- **Missed Trades Tracking**: Track setups that weren't entered, with reasons for non-activation.
- **Key Level Reaction Tests**: Log and analyze repeated touches/retests of critical supply/demand zones.

### 5. 📈 Analytics & Performance
- Interactive Equity Curves and Drawdown charts.
- Monthly / Weekly PnL breakdown.
- Session profitability matrix (Asia vs London vs New York).

### 6. ⚙️ Customization & Data Management
- Customizable setup names and mistake tags (no forced defaults).
- One-click CSV Export for Trades, Planned Trades, and Level Tests.
- Full JSON Data Backup & Restore.

---

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python 3.10+), SQLAlchemy, SQLite, Pydantic v2, Uvicorn
- **Frontend**: Vanilla JavaScript (ES6+ Modules), Modern CSS3 (Dark Theme, CSS Variables, Glassmorphism), Chart.js
- **Storage**: SQLite database (`data/journal.db`) and local upload directory (`backend/uploads/`)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10 or higher
- `pip` package manager

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/trading-journal-v1.1.git
   cd trading-journal-v1.1
   ```

2. **Create a virtual environment (optional but recommended)**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

- **On Windows (One-Click)**:
  Double-click `run.bat`

- **Via Terminal**:
  ```bash
  python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
  ```

Open your browser at [http://127.0.0.1:8000](http://127.0.0.1:8000) to view the journal.
Interactive API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 📁 Project Structure

```
trading-journal-v2/
├── .gitignore
├── requirements.txt
├── run.bat
├── README.md
├── backend/
│   ├── main.py             # FastAPI application & lifecycle
│   ├── database.py         # SQLAlchemy engine & session
│   ├── models.py           # Database models
│   ├── schemas.py          # Pydantic validation schemas
│   ├── crud.py             # Business logic & auto-calculations
│   ├── uploads/            # Trade chart screenshots
│   └── routers/            # API endpoints
│       ├── trades.py
│       ├── screenshots.py
│       ├── analytics.py
│       ├── planned.py
│       ├── level_tests.py
│       ├── settings.py
│       └── export.py
├── data/                   # SQLite database storage
└── frontend/
    ├── index.html          # Main SPA interface
    ├── css/
    │   └── style.css       # Complete dark-theme design system
    └── js/
        ├── app.js          # Navigation & state manager
        ├── api.js          # Backend API client
        ├── journal.js      # Trade journal table & actions
        ├── form.js         # Trade creation & screenshot upload
        ├── gallery.js      # Trade gallery & visual review
        ├── lightbox.js     # Fullscreen image viewer
        ├── setup_analysis.js # Setup performance & gallery
        ├── dashboard.js    # KPIs & charts
        ├── performance.js  # Performance metrics
        ├── analytics.js    # Advanced analytics
        ├── missed.js       # Missed trades
        ├── levels.js       # Level testing
        └── settings.js     # Settings & backup/export
```

---

## 📄 License
MIT License

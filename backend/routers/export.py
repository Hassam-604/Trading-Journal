"""
Export endpoints — export trades and planned trades to CSV and JSON,
plus complete journal backup export.
"""

import csv
import io
import json
from datetime import date, time, datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from .. import crud, models, schemas

router = APIRouter(prefix="/api/export", tags=["Export"])


def _json_serial(obj):
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime, date, time)):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


@router.get("/trades/csv")
def export_trades_csv(db: Session = Depends(get_db)):
    trades = crud.get_all_trades_ordered(db)
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    headers = [
        "ID", "Date", "Time", "Pair", "Session", "Direction",
        "Entry Price", "Stop Loss", "Take Profit", "Risk", "RR",
        "Setup", "Result", "PnL", "R Multiple",
        "Daily Bias", "Hourly Bias", "M30 Bias", "M15 Bias", "M5 Bias", "M1 Bias",
        "Liquidity", "Displacement", "Rule Followed", "Mistake", "Lesson", "Notes"
    ]
    writer.writerow(headers)

    for t in trades:
        writer.writerow([
            t.id, t.date, t.time, t.pair, t.session, t.direction,
            t.entry_price, t.stop_loss, t.take_profit, t.risk, t.rr,
            t.setup or "", t.result, t.pnl, t.r_multiple,
            t.daily_bias or "", t.hourly_bias or "", t.m30_bias or "",
            t.m15_bias or "", t.m5_bias or "", t.m1_bias or "",
            t.liquidity or "", t.displacement or "", t.rule_followed or "",
            t.mistake or "", t.lesson or "", t.notes or ""
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trades_export.csv"}
    )


@router.get("/trades/json")
def export_trades_json(db: Session = Depends(get_db)):
    trades = crud.get_all_trades_ordered(db)
    trade_list = []
    for t in trades:
        trade_list.append({
            "id": t.id,
            "date": t.date.isoformat() if t.date else None,
            "time": t.time.isoformat() if t.time else None,
            "pair": t.pair,
            "session": t.session,
            "direction": t.direction,
            "entry_price": t.entry_price,
            "stop_loss": t.stop_loss,
            "take_profit": t.take_profit,
            "risk": t.risk,
            "rr": t.rr,
            "setup": t.setup,
            "result": t.result,
            "pnl": t.pnl,
            "r_multiple": t.r_multiple,
            "daily_bias": t.daily_bias,
            "hourly_bias": t.hourly_bias,
            "m30_bias": t.m30_bias,
            "m15_bias": t.m15_bias,
            "m5_bias": t.m5_bias,
            "m1_bias": t.m1_bias,
            "liquidity": t.liquidity,
            "displacement": t.displacement,
            "rule_followed": t.rule_followed,
            "mistake": t.mistake,
            "lesson": t.lesson,
            "notes": t.notes,
        })
    json_str = json.dumps(trade_list, indent=2)
    return Response(
        content=json_str,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=trades_export.json"}
    )


@router.get("/planned/csv")
def export_planned_csv(db: Session = Depends(get_db)):
    planned = crud.get_planned_trades(db, limit=5000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Pair", "Direction", "Entry", "Session", "Setup", "Status", "Reason Not Activated", "Target", "Expected RR", "Notes"])
    for p in planned:
        writer.writerow([p.id, p.planned_date, p.pair, p.direction, p.planned_entry, p.session or "", p.setup or "", p.status, p.reason_not_activated or "", p.target or "", p.expected_rr or "", p.notes or ""])
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=planned_trades_export.csv"})


@router.get("/levels/csv")
def export_levels_csv(db: Session = Depends(get_db)):
    from ..models import LevelTest
    tests = db.query(LevelTest).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Planned Trade ID", "Test Date", "Test Number", "Price", "Reaction", "Level Status", "Notes"])
    for lt in tests:
        writer.writerow([lt.id, lt.planned_trade_id, lt.test_date, lt.test_number, lt.price or "", lt.reaction, lt.level_status, lt.notes or ""])
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=level_tests_export.csv"})


@router.get("/backup/all")
def export_all_backup(db: Session = Depends(get_db)):
    settings = crud.get_settings(db)
    setups = crud.get_setup_tags(db)
    mistakes = crud.get_mistake_tags(db)
    trades = crud.get_all_trades_ordered(db)
    planned = crud.get_planned_trades(db, limit=1000)

    backup = {
        "export_date": datetime.utcnow().isoformat(),
        "settings": {
            "starting_balance": settings.starting_balance,
            "default_risk": settings.default_risk,
            "currency": settings.currency,
            "default_pair": settings.default_pair,
            "default_rr": settings.default_rr,
        },
        "setups": [{"id": s.id, "name": s.name, "is_default": s.is_default} for s in setups],
        "mistakes": [{"id": m.id, "name": m.name, "is_default": m.is_default} for m in mistakes],
        "trades": [
            {
                "date": t.date.isoformat() if t.date else None,
                "time": t.time.isoformat() if t.time else None,
                "pair": t.pair,
                "session": t.session,
                "direction": t.direction,
                "entry_price": t.entry_price,
                "stop_loss": t.stop_loss,
                "take_profit": t.take_profit,
                "risk": t.risk,
                "rr": t.rr,
                "setup": t.setup,
                "result": t.result,
                "pnl": t.pnl,
                "r_multiple": t.r_multiple,
                "notes": t.notes,
                "mistake": t.mistake,
                "lesson": t.lesson,
            }
            for t in trades
        ],
        "planned_trades": [
            {
                "planned_date": pt.planned_date.isoformat() if pt.planned_date else None,
                "pair": pt.pair,
                "direction": pt.direction,
                "planned_entry": pt.planned_entry,
                "invalidation": pt.invalidation,
                "target": pt.target,
                "expected_rr": pt.expected_rr,
                "session": pt.session,
                "setup": pt.setup,
                "timeframe": pt.timeframe,
                "reason_not_activated": pt.reason_not_activated,
                "status": pt.status,
                "notes": pt.notes,
                "level_tests": [
                    {
                        "test_date": lt.test_date.isoformat() if lt.test_date else None,
                        "test_number": lt.test_number,
                        "price": lt.price,
                        "reaction": lt.reaction,
                        "level_status": lt.level_status,
                        "notes": lt.notes,
                    }
                    for lt in pt.level_tests
                ],
            }
            for pt in planned
        ],
    }

    return Response(
        content=json.dumps(backup, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=trading_journal_backup.json"}
    )


@router.post("/restore/json")
def restore_json_backup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        content = file.file.read()
        data = json.loads(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    imported_trades = 0
    # For now, we only append trades that don't exist, or just insert them fresh without IDs
    for t in data.get("trades", []):
        t.pop("id", None)
        t_create = schemas.TradeCreate(**t)
        crud.create_trade(db, t_create)
        imported_trades += 1
        
    for p in data.get("planned_trades", []):
        p.pop("id", None)
        tests = p.pop("level_tests", [])
        p_create = schemas.PlannedTradeCreate(**p)
        planned_db = crud.create_planned_trade(db, p_create)
        for lt in tests:
            lt.pop("id", None)
            lt["planned_trade_id"] = planned_db.id
            lt_create = schemas.LevelTestCreate(**lt)
            crud.create_level_test(db, lt_create)

    return {"status": "success", "message": f"Restored {imported_trades} trades and planned trades"}

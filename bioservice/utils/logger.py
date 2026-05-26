import json
from datetime import datetime
import sys

def _emit(level: str, msg: str, **meta):
    out = {
        "ts": datetime.utcnow().isoformat() + 'Z',
        "level": level,
        "msg": msg,
        **meta
    }
    print(json.dumps(out), file=sys.stdout)

def info(msg: str, **meta):
    _emit('info', msg, **meta)

def warn(msg: str, **meta):
    _emit('warn', msg, **meta)

def error(msg: str, **meta):
    _emit('error', msg, **meta)

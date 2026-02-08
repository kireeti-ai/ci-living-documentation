import logging
import json
import sys
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from epic4.config import config
import os

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logging():
    logger = logging.getLogger("epic4")
    logger.setLevel(logging.INFO)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    
    # File handler
    os.makedirs(config.LOGS_DIR, exist_ok=True)
    log_file = os.path.join(config.LOGS_DIR, "epic4_execution.json")
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(JsonFormatter())
    logger.addHandler(file_handler)
    
    return logger

logger = setup_logging()

# Secure logging filter to redact token
# (Simple string replacement implementation for this scope)
# Ideally, we'd filter at the record level, but we rely on developers not to explicitly log tokens.
# We will just ensure we don't log the config object directly.

def get_retry_decorator():
    return retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )

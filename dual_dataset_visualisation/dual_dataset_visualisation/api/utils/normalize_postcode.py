import math
import re


def normalize_postcode(value):
    if value is None:
        return None

    # Handle NaN (pandas)
    if isinstance(value, float):
        if math.isnan(value):
            return None
        # 1234.0 -> "1234"
        if value.is_integer():
            value = str(int(value))
        else:
            return None

    # Convert to string
    value = str(value).strip().upper()

    # Remove any non-numeric characters, we only need the digits
    value = re.sub(r'\D', '', value)

    return value

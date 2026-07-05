from enum import StrEnum


class AggregateFunctions(StrEnum):
    AVG = "AVG"
    SUM = "SUM"
    MIN = "MIN"
    MAX = "MAX"
    COUNT = "COUNT"
    MEDIAN = "MEDIAN"
    VAR = "VAR"
    COUNT_NAN = "COUNT_NAN"
    MEAN_DIFFERENCE = "MEAN_DIFFERENCE"
    VAR_DIFFERENCE = "VAR_DIFFERENCE"

    @classmethod
    def choices(cls):
        return [(key, key) for key in cls]

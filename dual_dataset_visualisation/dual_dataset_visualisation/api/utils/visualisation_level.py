from enum import StrEnum


class VisualisationLevel(StrEnum):
    PROVINCE = "province"
    MUNICIPALITY = "municipality"

    @classmethod
    def choices(cls):
        return [(key, key) for key in cls]

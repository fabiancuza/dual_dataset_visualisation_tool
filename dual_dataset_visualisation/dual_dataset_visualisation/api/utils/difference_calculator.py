from dual_dataset_visualisation.api.utils.aggregate_functions import AggregateFunctions


class DifferenceCalculator:
    def __init__(self, original_aggregated, synthetic_aggregated, aggregate_function):
        self.original_aggregated = original_aggregated
        self.synthetic_aggregated = synthetic_aggregated
        self.aggregate_function = aggregate_function

    def calculate_difference(self):
        return self._basic_difference()

    def _basic_difference(self):
        differences = {}
        all_keys = set(self.original_aggregated.keys()).union(set(self.synthetic_aggregated.keys()))
        for key in all_keys:
            original_value = self.original_aggregated.get(key, 0)
            synthetic_value = self.synthetic_aggregated.get(key, 0)
            differences[key] = synthetic_value - original_value
        return differences

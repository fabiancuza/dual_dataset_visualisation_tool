from django.db.models import Avg, Sum, Min, Max, Count, Aggregate, FloatField, Variance, Q
from django.db.models.functions import Cast
from .visualisation_level import VisualisationLevel
from .aggregate_functions import AggregateFunctions


class PercentileCont(Aggregate):
    function = "PERCENTILE_CONT"
    name = "PercentileCont"
    output_field = FloatField()

    # ordered-set aggregate syntax in Postgres:
    # percentile_cont(0.5) WITHIN GROUP (ORDER BY <expr>)
    template = "%(function)s(%(percentile)s) WITHIN GROUP (ORDER BY %(expressions)s)"

    def __init__(self, expression, percentile, **extra):
        extra["percentile"] = percentile
        super().__init__(expression, **extra)


class Aggregator:
    def __init__(self, dataset, field_name, visualisation_level, aggregate_function):
        self.dataset = dataset
        self.field_name = field_name
        self.visualisation_level = visualisation_level
        self.aggregate_function = aggregate_function

    def _group_field(self) -> str:
        # Adjust these to match your VisualisationLevel enum values
        if self.visualisation_level == VisualisationLevel.MUNICIPALITY:
            return "postcode__neighborhood__district__municipality__code"
        if self.visualisation_level == VisualisationLevel.PROVINCE:
            return "postcode__neighborhood__district__municipality__province__code"
        raise ValueError(f"Unsupported visualisation_level: {self.visualisation_level}")

    def get_aggregated_data(self, row_type) -> dict:
        group_field = self._group_field()

        qs = (
            self.dataset.rows.filter(type=row_type)
            .select_related("postcode")
        )
        if self.aggregate_function != AggregateFunctions.COUNT_NAN:
            qs = qs.exclude(**{f"row_data__{self.field_name}__isnull": True})

        # Extract row_data[field_name] and cast to float for numeric aggregation
        # NOTE: If some values are non-numeric strings, Postgres may error on cast.
        value_expr = Cast(f"row_data__{self.field_name}", output_field=FloatField())

        af = self.aggregate_function

        if af == AggregateFunctions.AVG:
            agg_expr = Avg(value_expr)
        elif af == AggregateFunctions.SUM:
            agg_expr = Sum(value_expr)
        elif af == AggregateFunctions.MIN:
            agg_expr = Min(value_expr)
        elif af == AggregateFunctions.MAX:
            agg_expr = Max(value_expr)
        elif af == AggregateFunctions.COUNT:
            # count rows that have a non-null key (not necessarily numeric)
            agg_expr = Count("id")
        elif af == AggregateFunctions.COUNT_NAN:
            # count rows where the field is null or non-numeric
            total_count = Count("id")
            valid_count = Count("id", filter=~Q(**{f"row_data__{self.field_name}__isnull": True}) & Q(**{f"row_data__{self.field_name}__regex": r'^\s*-?\d+(\.\d+)?\s*$'}))
            agg_expr = total_count - valid_count
        elif af == AggregateFunctions.MEDIAN:
            if PercentileCont is None:
                # Fallback: compute in Python per group (works on any DB, slower).
                values = (
                    qs.values(group_field, f"row_data__{self.field_name}")
                )
                buckets = {}
                for row in values:
                    gid = row[group_field]
                    v = row.get(f"row_data__{self.field_name}")
                    if gid is None or v is None:
                        continue
                    try:
                        v = float(v)
                    except (TypeError, ValueError):
                        continue
                    buckets.setdefault(gid, []).append(v)

                out = {}
                for gid, arr in buckets.items():
                    arr.sort()
                    n = len(arr)
                    if n == 0:
                        continue
                    mid = n // 2
                    out[gid] = arr[mid] if n % 2 == 1 else (arr[mid - 1] + arr[mid]) / 2.0
                return out

            # Postgres median (continuous percentile 0.5)
            agg_expr = PercentileCont(value_expr, 0.5)
        elif af == AggregateFunctions.VAR:
            agg_expr = Variance(value_expr)
        else:
            raise ValueError(f"Unsupported aggregate_function: {af}")

        rows = (
            qs.values(group_field)
              .annotate(value=agg_expr)
              .order_by()
        )

        # Return {group_id: aggregated_value}
        return {r[group_field]: r["value"] for r in rows if r[group_field] is not None}

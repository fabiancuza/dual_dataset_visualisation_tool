from rest_framework import serializers
import csv
import io


class FileValidatorSerializer(serializers.Serializer):
    original_file = serializers.FileField()
    synthetic_file = serializers.FileField()

    class Meta:
        fields = ["original_file", "synthetic_file"]

    def _ensure_csv(self, f, field_name: str):
        # Check filename extension
        name = (getattr(f, "name", "") or "").lower()
        if not name.endswith(".csv"):
            raise serializers.ValidationError({field_name: "File must have a .csv extension."})

        # Check content-type if provided (not always reliable, but helpful)
        ct = getattr(f, "content_type", None)
        if ct and ct not in ("text/csv", "application/csv", "application/vnd.ms-excel"):
            raise serializers.ValidationError({field_name: f"Invalid content type: {ct}. Expected CSV."})

    def read_header_columns(self, f, field_name: str) -> list[str]:
        """
        Read CSV header columns with minimal IO.
        Works for InMemoryUploadedFile / TemporaryUploadedFile.
        """
        try:
            # Ensure we read from the start and restore afterwards
            pos = f.tell()
            f.seek(0)

            # Read a small chunk; enough to cover header line
            raw = f.read(64 * 1024)
            if isinstance(raw, str):
                text = raw
            else:
                # try utf-8; if you need more encodings, extend this
                text = raw.decode("utf-8-sig")

            # Parse header
            buf = io.StringIO(text)
            reader = csv.reader(buf)
            header = next(reader, None)
            if not header:
                raise serializers.ValidationError({field_name: "CSV appears to be empty or missing a header row."})

            cols = [c.strip() for c in header if c is not None]
            if not cols or any(c == "" for c in cols):
                raise serializers.ValidationError({field_name: "Header contains empty column name(s)."})
            if len(set(cols)) != len(cols):
                raise serializers.ValidationError({field_name: "Header contains duplicate column name(s)."})

            return cols
        except UnicodeDecodeError:
            raise serializers.ValidationError({field_name: "CSV must be UTF-8 encoded (optionally with BOM)."})
        except csv.Error:
            raise serializers.ValidationError({field_name: "Invalid CSV format."})
        finally:
            try:
                f.seek(pos)
            except Exception:
                pass

    def validate(self, attrs):
        original = attrs["original_file"]
        synthetic = attrs["synthetic_file"]

        self._ensure_csv(original, "original_file")
        self._ensure_csv(synthetic, "synthetic_file")

        original_cols = self.read_header_columns(original, "original_file")
        synthetic_cols = self.read_header_columns(synthetic, "synthetic_file")

        # Same columns (order-insensitive)
        if set(original_cols) != set(synthetic_cols):
            raise serializers.ValidationError("The two files do not have the same columns.")

        return attrs

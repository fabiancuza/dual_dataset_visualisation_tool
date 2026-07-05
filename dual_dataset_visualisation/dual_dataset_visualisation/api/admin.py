from django.contrib import admin
from .models import Dataset, DatasetRow, Postcode, Province, Municipality, District, Neighborhood, PostcodeError, PostcodeErrorReport


class DatasetRowInline(admin.TabularInline):
    model = DatasetRow
    extra = 0
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DatasetRow)
class DatasetRowAdmin(admin.ModelAdmin):
    list_display = ('id', 'dataset', 'postcode', 'created_at')
    search_fields = ('dataset__name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'status', 'created_at', 'updated_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    # inlines = [DatasetRowInline]
    actions = ['process_datasets']

    @admin.action(description='Process selected datasets')
    def process_datasets(self, request, queryset):
        for dataset in queryset:
            dataset.process()


@admin.register(Postcode)
class PostcodeAdmin(admin.ModelAdmin):
    list_display = ('postcode', 'neighborhood__district__municipality__province', 'neighborhood__district__municipality', 'neighborhood__district', 'neighborhood')
    search_fields = ('postcode', 'neighborhood__district__municipality__province__name', 'neighborhood__district__municipality__name', 'neighborhood__district__name', 'neighborhood__name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    search_fields = ('code', 'name')


@admin.register(Municipality)
class MunicipalityAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'province')
    search_fields = ('code', 'name', 'province__name')


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'municipality')
    search_fields = ('code', 'name', 'municipality__name')


@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'district')
    search_fields = ('code', 'name', 'district__name')


class PostcodeErrorReportInline(admin.TabularInline):
    model = PostcodeErrorReport
    extra = 0
    readonly_fields = ('dataset', 'created_at')


@admin.register(PostcodeError)
class PostcodeErrorAdmin(admin.ModelAdmin):
    list_display = ('value', 'reports_count', 'first_reported_at')
    inlines = [PostcodeErrorReportInline]

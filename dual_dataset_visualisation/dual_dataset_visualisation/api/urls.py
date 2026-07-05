from .views import DatasetViewSet, AggregateFunctionsViewSet, MunicipalityViewSet, ProvinceViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'datasets', DatasetViewSet)
router.register(r'utils/aggregate-functions', AggregateFunctionsViewSet, basename='aggregate-functions')
router.register(r'administrative-regions/provinces', ProvinceViewSet, basename='provinces')
router.register(r'administrative-regions/municipalities', MunicipalityViewSet, basename='municipalities')

urls = router.urls

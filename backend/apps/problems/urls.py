from django.urls import path
from .views import (
    ProblemListView, ProblemDetailView
)
from apps.submissions.views import ProblemSubmissionsView

urlpatterns = [
    # Public endpoints
    path('', ProblemListView.as_view(), name='problem-list'),
    path('<slug:slug>/', ProblemDetailView.as_view(), name='problem-detail'),
    path('<slug:slug>/submissions/', ProblemSubmissionsView.as_view(), name='problem-submissions'),
]
